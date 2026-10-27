import { Response, NextFunction } from "express";
import Story from "../models/Story";
import User from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { uploadToIPFS } from "../services/ipfs.service";
import { getSocketIO } from "../sockets";

const STORY_DURATION_HOURS = 24;

export async function createStory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { caption = "", bgGradient = "", fontStyle = "normal" } = req.body;

    let mediaIPFSHash = "";
    if (req.file) {
      mediaIPFSHash = await uploadToIPFS(req.file.path, req.file.originalname);
    }

    if (!mediaIPFSHash && !caption.trim()) {
      throw new AppError("Story must have media or caption", 400);
    }

    const expiresAt = new Date(Date.now() + STORY_DURATION_HOURS * 60 * 60 * 1000);

    const story = await Story.create({
      userId,
      mediaIPFSHash,
      caption,
      bgGradient,
      fontStyle,
      expiresAt,
    });

    const populated = await Story.findById(story._id).populate(
      "userId",
      "username avatar"
    );

    const io = getSocketIO();
    if (io) {
      io.emit("new-story", populated);
    }

    res.status(201).json({ story: populated });
  } catch (error) {
    next(error);
  }
}

export async function getStories(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const currentUser = await User.findById(userId);
    if (!currentUser) throw new AppError("User not found", 404);

    const followingIds = [...currentUser.following.map((id) => id.toString()), userId];

    const stories = await Story.find({
      userId: { $in: followingIds },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate("userId", "username avatar");

    const grouped: Record<string, any> = {};
    for (const story of stories) {
      const uid = (story.userId as any)._id?.toString() || story.userId.toString();
      if (!grouped[uid]) {
        grouped[uid] = {
          user: story.userId,
          stories: [],
          hasUnviewed: false,
        };
      }
      const viewed = story.viewers.some((v) => v.toString() === userId);
      if (!viewed) grouped[uid].hasUnviewed = true;
      grouped[uid].stories.push({
        _id: story._id,
        mediaIPFSHash: story.mediaIPFSHash,
        caption: story.caption,
        bgGradient: story.bgGradient,
        fontStyle: story.fontStyle,
        viewerCount: story.viewers.length,
        reactions: story.reactions,
        viewed,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt,
      });
    }

    const myStories = grouped[userId];
    delete grouped[userId];
    const otherStories = Object.values(grouped);
    if (myStories) otherStories.unshift(myStories);

    res.json({ storyGroups: otherStories });
  } catch (error) {
    next(error);
  }
}

export async function viewStory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const story = await Story.findById(req.params.id);
    if (!story) throw new AppError("Story not found", 404);

    if (!story.viewers.some((v) => v.toString() === userId)) {
      story.viewers.push(userId as any);
      await story.save();
    }

    const storyWithViewers = await Story.findById(req.params.id)
      .populate("viewers", "username avatar");

    res.json({
      viewerCount: story.viewers.length,
      viewers: storyWithViewers?.viewers || [],
    });
  } catch (error) {
    next(error);
  }
}

export async function reactToStory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { emoji } = req.body;
    const story = await Story.findById(req.params.id);
    if (!story) throw new AppError("Story not found", 404);

    const existingIdx = story.reactions.findIndex(
      (r) => r.userId.toString() === userId
    );
    if (existingIdx >= 0) {
      story.reactions[existingIdx].emoji = emoji;
    } else {
      story.reactions.push({ userId: userId as any, emoji });
    }

    await story.save();
    res.json({ reactions: story.reactions });
  } catch (error) {
    next(error);
  }
}

export async function deleteStory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) throw new AppError("Story not found", 404);
    if (story.userId.toString() !== req.userId) {
      throw new AppError("Not authorized", 403);
    }
    await Story.findByIdAndDelete(req.params.id);
    res.json({ message: "Story deleted" });
  } catch (error) {
    next(error);
  }
}
