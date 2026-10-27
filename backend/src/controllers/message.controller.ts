import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import Message from "../models/Message";
import User from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { encryptMessage, decryptMessage } from "../services/encryption.service";

export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const senderId = req.userId!;
    const { receiverId, text } = req.body;

    const receiver = await User.findById(receiverId);
    if (!receiver) throw new AppError("Recipient not found", 404);

    const { encrypted, iv } = encryptMessage(text);

    const message = await Message.create({
      senderId,
      receiverId,
      encryptedMessage: encrypted,
      iv,
    });

    res.status(201).json({
      message: {
        id: message._id,
        senderId,
        receiverId,
        text,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { partnerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Mark received messages as read
    await Message.updateMany(
      { senderId: partnerId, receiverId: userId, read: false },
      { read: true }
    );

    const decryptedMessages = messages.map((msg) => ({
      id: msg._id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      text: decryptMessage(msg.encryptedMessage, msg.iv),
      read: msg.read,
      createdAt: msg.createdAt,
    }));

    res.json({ messages: decryptedMessages.reverse() });
  } catch (error) {
    next(error);
  }
}

export async function getConversationList(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId!);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
      },
      {
        $sort: { createdAt: -1 as const },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", userId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$receiverId", userId] }, { $eq: ["$read", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 as const } },
    ]);

    const partnerIds = conversations.map((c) => c._id);
    const partners = await User.find({ _id: { $in: partnerIds } })
      .select("username avatar isOnline lastSeen");

    const partnerMap = new Map(partners.map((p) => [p._id.toString(), p]));

    const result = conversations.map((c) => ({
      partner: partnerMap.get(c._id.toString()),
      lastMessageAt: c.lastMessage.createdAt,
      unreadCount: c.unreadCount,
    }));

    res.json({ conversations: result });
  } catch (error) {
    next(error);
  }
}
