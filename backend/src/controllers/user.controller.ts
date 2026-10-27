import { Response, NextFunction } from "express";
import fs from "fs";
import User from "../models/User";
import Notification from "../models/Notification";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { getSocketIO } from "../sockets";

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("followers", "username avatar")
      .populate("following", "username avatar");

    if (!user) throw new AppError("User not found", 404);

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { bio, username } = req.body;

    const updateData: Record<string, any> = {};
    if (bio !== undefined) updateData.bio = bio;
    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: userId } });
      if (existing) throw new AppError("Username already taken", 409);
      updateData.username = username;
    }

    if (req.file) {
      const filePath = req.file.path;
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = req.file.mimetype || "image/jpeg";
      const base64 = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
      updateData.avatar = base64;
      try { fs.unlinkSync(filePath); } catch {}
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) throw new AppError("User not found", 404);

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function followUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const targetId = req.params.id;

    if (userId === targetId) {
      throw new AppError("Cannot follow yourself", 400);
    }

    const [user, target] = await Promise.all([
      User.findById(userId),
      User.findById(targetId),
    ]);

    if (!user || !target) throw new AppError("User not found", 404);

    const isFollowing = user.following.some((id) => id.toString() === targetId);

    if (isFollowing) {
      user.following = user.following.filter((id) => id.toString() !== targetId) as any;
      target.followers = target.followers.filter((id) => id.toString() !== userId) as any;
    } else {
      user.following.push(targetId as any);
      target.followers.push(userId as any);

      await Notification.create({
        userId: targetId,
        fromUserId: userId,
        type: "follow",
        referenceId: userId,
        message: `${user.username} started following you`,
      });

      const io = getSocketIO();
      if (io) {
        io.to(targetId).emit("notification", {
          type: "follow",
          fromUserId: userId,
          username: user.username,
        });
      }
    }

    await Promise.all([user.save(), target.save()]);

    res.json({
      following: !isFollowing,
      followersCount: target.followers.length,
      followingCount: user.following.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function searchUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.json({ users: [] });
      return;
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { walletAddress: { $regex: query, $options: "i" } },
      ],
    })
      .select("username avatar walletAddress reputationScore bio")
      .limit(20);

    res.json({ users });
  } catch (error) {
    next(error);
  }
}

export async function getSuggestedUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const currentUser = await User.findById(userId);
    if (!currentUser) throw new AppError("User not found", 404);

    const excludeIds = [userId, ...currentUser.following.map((id) => id.toString())];

    const users = await User.find({ _id: { $nin: excludeIds } })
      .select("username avatar bio reputationScore")
      .sort({ reputationScore: -1 })
      .limit(10);

    res.json({ users });
  } catch (error) {
    next(error);
  }
}
