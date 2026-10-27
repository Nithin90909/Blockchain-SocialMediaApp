import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Message from "../models/Message";
import Notification from "../models/Notification";
import Story from "../models/Story";
import { encryptMessage } from "../services/encryption.service";
import { logger } from "../config/logger";

let io: Server | null = null;

export function getSocketIO(): Server | null {
  return io;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface LiveStreamInfo {
  hostId: string;
  hostUsername: string;
  title: string;
  viewers: Set<string>;
  startedAt: string;
}

const liveStreams = new Map<string, LiveStreamInfo>();

export function initializeSocket(server: HttpServer): void {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as {
        userId: string;
      };
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    logger.info(`Socket connected: ${userId}`);

    socket.join(userId);

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    io!.emit("user-status", { userId, isOnline: true });

    // ---- Messaging ----

    socket.on("send-message", async (data: { receiverId: string; text: string }) => {
      try {
        const { encrypted, iv } = encryptMessage(data.text);

        const message = await Message.create({
          senderId: userId,
          receiverId: data.receiverId,
          encryptedMessage: encrypted,
          iv,
        });

        const payload = {
          id: message._id,
          senderId: userId,
          receiverId: data.receiverId,
          text: data.text,
          createdAt: message.createdAt,
        };

        socket.emit("message-sent", payload);
        io!.to(data.receiverId).emit("new-message", payload);
      } catch (error: any) {
        socket.emit("message-error", { error: error.message });
      }
    });

    socket.on("typing", (data: { receiverId: string }) => {
      io!.to(data.receiverId).emit("user-typing", { userId });
    });

    socket.on("stop-typing", (data: { receiverId: string }) => {
      io!.to(data.receiverId).emit("user-stop-typing", { userId });
    });

    socket.on("mark-read", async (data: { senderId: string }) => {
      await Message.updateMany(
        { senderId: data.senderId, receiverId: userId, read: false },
        { read: true }
      );
      io!.to(data.senderId).emit("messages-read", { readBy: userId });
    });

    // ---- Live Streaming ----

    socket.on("live:get-streams", () => {
      const streams = Array.from(liveStreams.values()).map((s) => ({
        hostId: s.hostId,
        hostUsername: s.hostUsername,
        title: s.title,
        viewerCount: s.viewers.size,
        startedAt: s.startedAt,
      }));
      socket.emit("live:streams-list", streams);
    });

    socket.on("live:start-stream", async (data: { title: string }) => {
      const user = await User.findById(userId).select("username");
      const streamInfo: LiveStreamInfo = {
        hostId: userId,
        hostUsername: user?.username || "Unknown",
        title: data.title,
        viewers: new Set(),
        startedAt: new Date().toISOString(),
      };
      liveStreams.set(userId, streamInfo);
      socket.join(`live:${userId}`);
      logger.info(`Live stream started by ${userId}: ${data.title}`);
      broadcastStreamsList();
    });

    socket.on("live:stop-stream", () => {
      liveStreams.delete(userId);
      io!.to(`live:${userId}`).emit("live:stream-ended");
      socket.leave(`live:${userId}`);
      logger.info(`Live stream ended by ${userId}`);
      broadcastStreamsList();
    });

    socket.on("live:join-stream", (data: { hostId: string }) => {
      const stream = liveStreams.get(data.hostId);
      if (!stream) return;
      stream.viewers.add(userId);
      socket.join(`live:${data.hostId}`);
      io!.to(data.hostId).emit("live:viewer-joined", { viewerId: userId });
      io!.to(`live:${data.hostId}`).emit("live:viewer-count", { count: stream.viewers.size });
    });

    socket.on("live:leave-stream", (data: { hostId: string }) => {
      const stream = liveStreams.get(data.hostId);
      if (!stream) return;
      stream.viewers.delete(userId);
      socket.leave(`live:${data.hostId}`);
      io!.to(`live:${data.hostId}`).emit("live:viewer-count", { count: stream.viewers.size });
    });

    socket.on("live:offer", (data: { to: string; offer: any }) => {
      io!.to(data.to).emit("live:offer", { from: userId, offer: data.offer });
    });

    socket.on("live:answer", (data: { to: string; answer: any }) => {
      io!.to(data.to).emit("live:answer", { from: userId, answer: data.answer });
    });

    socket.on("live:ice-candidate", (data: { to: string; candidate: any }) => {
      io!.to(data.to).emit("live:ice-candidate", { from: userId, candidate: data.candidate });
    });

    socket.on("live:comment", async (data: { hostId: string; text: string }) => {
      const user = await User.findById(userId).select("username");
      const comment = {
        userId,
        username: user?.username || "Unknown",
        text: data.text,
        timestamp: new Date().toISOString(),
      };
      io!.to(`live:${data.hostId}`).emit("live:comment", comment);
    });

    socket.on("live:reaction", (data: { hostId: string; emoji: string }) => {
      io!.to(`live:${data.hostId}`).emit("live:reaction", { emoji: data.emoji, from: userId });
    });

    // ---- Story Interactions ----

    socket.on("story:react", async (data: { storyId: string; emoji: string }) => {
      try {
        const story = await Story.findById(data.storyId);
        if (!story) return;

        const storyOwnerId = story.userId.toString();
        if (storyOwnerId === userId) return;

        const existingIdx = story.reactions.findIndex(
          (r) => r.userId.toString() === userId
        );
        if (existingIdx >= 0) {
          story.reactions[existingIdx].emoji = data.emoji;
        } else {
          story.reactions.push({ userId: userId as any, emoji: data.emoji });
        }
        await story.save();

        const sender = await User.findById(userId).select("username");

        const { encrypted, iv } = encryptMessage(`Reacted ${data.emoji} to your story`);
        const message = await Message.create({
          senderId: userId,
          receiverId: storyOwnerId,
          encryptedMessage: encrypted,
          iv,
        });

        const msgPayload = {
          id: message._id,
          senderId: userId,
          receiverId: storyOwnerId,
          text: `Reacted ${data.emoji} to your story`,
          createdAt: message.createdAt,
        };
        socket.emit("message-sent", msgPayload);
        io!.to(storyOwnerId).emit("new-message", msgPayload);

        await Notification.create({
          userId: storyOwnerId,
          fromUserId: userId,
          type: "like",
          referenceId: data.storyId,
          message: `${sender?.username} reacted ${data.emoji} to your story`,
        });
        io!.to(storyOwnerId).emit("notification", {
          type: "story_reaction",
          fromUserId: userId,
          emoji: data.emoji,
          username: sender?.username,
        });

        socket.emit("story:react-sent", { storyId: data.storyId, emoji: data.emoji });
      } catch (error: any) {
        logger.error("Story react error:", error.message);
      }
    });

    socket.on("story:reply", async (data: { storyOwnerId: string; storyId: string; text: string }) => {
      try {
        if (!data.text.trim()) return;
        if (data.storyOwnerId === userId) return;

        const sender = await User.findById(userId).select("username");

        const { encrypted, iv } = encryptMessage(data.text);
        const message = await Message.create({
          senderId: userId,
          receiverId: data.storyOwnerId,
          encryptedMessage: encrypted,
          iv,
        });

        const msgPayload = {
          id: message._id,
          senderId: userId,
          receiverId: data.storyOwnerId,
          text: data.text,
          createdAt: message.createdAt,
        };
        socket.emit("message-sent", msgPayload);
        io!.to(data.storyOwnerId).emit("new-message", msgPayload);

        await Notification.create({
          userId: data.storyOwnerId,
          fromUserId: userId,
          type: "message",
          referenceId: data.storyId,
          message: `${sender?.username} replied to your story`,
        });
        io!.to(data.storyOwnerId).emit("notification", {
          type: "story_reply",
          fromUserId: userId,
          username: sender?.username,
        });

        socket.emit("story:reply-sent", { storyId: data.storyId });
      } catch (error: any) {
        logger.error("Story reply error:", error.message);
      }
    });

    // ---- Disconnect ----

    socket.on("disconnect", async () => {
      logger.info(`Socket disconnected: ${userId}`);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      io!.emit("user-status", { userId, isOnline: false });

      if (liveStreams.has(userId)) {
        io!.to(`live:${userId}`).emit("live:stream-ended");
        liveStreams.delete(userId);
        broadcastStreamsList();
      }

      for (const [hostId, stream] of liveStreams) {
        if (stream.viewers.has(userId)) {
          stream.viewers.delete(userId);
          io!.to(`live:${hostId}`).emit("live:viewer-count", { count: stream.viewers.size });
        }
      }
    });
  });

  function broadcastStreamsList() {
    const streams = Array.from(liveStreams.values()).map((s) => ({
      hostId: s.hostId,
      hostUsername: s.hostUsername,
      title: s.title,
      viewerCount: s.viewers.size,
      startedAt: s.startedAt,
    }));
    io!.emit("live:streams-list", streams);
  }
}
