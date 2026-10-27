import { Request, Response, NextFunction } from "express";
import { ethers } from "ethers";
import Post from "../models/Post";
import User from "../models/User";
import Notification from "../models/Notification";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { uploadToIPFS } from "../services/ipfs.service";
import { createPostOnChain, verifyPostIntegrity } from "../services/blockchain.service";
import { analyzeCredibility, analyzeImage } from "../services/ml.service";
import { logger } from "../config/logger";
import { getSocketIO } from "../sockets";

async function notifyMentions(text: string, fromUserId: string, referenceId: string) {
  const mentionPattern = /@(\w{3,32})/g;
  const mentions = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = mentionPattern.exec(text)) !== null) {
    mentions.add(match[1]);
  }

  if (mentions.size === 0) return;

  const mentionedUsers = await User.find({ username: { $in: Array.from(mentions) } });
  const io = getSocketIO();

  for (const mentioned of mentionedUsers) {
    if (mentioned._id.toString() === fromUserId) continue;
    await Notification.create({
      userId: mentioned._id,
      fromUserId,
      type: "mention",
      referenceId,
      message: "mentioned you in a post",
    });
    if (io) {
      io.to(mentioned._id.toString()).emit("notification", {
        type: "mention",
        referenceId,
        fromUserId,
      });
    }
  }
}

const VISIBILITY_MAP: Record<string, number> = {
  public: 0,
  followers: 1,
  private: 2,
};

export async function createPost(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { content, visibility = "public" } = req.body;
    const userId = req.userId!;

    let mediaIPFSHash = "";
    if (req.file) {
      mediaIPFSHash = await uploadToIPFS(req.file.path, req.file.originalname);
    }

    const contentHash = ethers.keccak256(ethers.toUtf8Bytes(content));

    let pollData;
    if (req.body.pollQuestion && req.body.pollOptions) {
      let options: string[];
      try {
        options = typeof req.body.pollOptions === "string"
          ? JSON.parse(req.body.pollOptions)
          : req.body.pollOptions;
      } catch {
        options = [];
      }
      if (options.length >= 2 && options.length <= 6) {
        const durationHours = parseInt(req.body.pollDuration) || 24;
        pollData = {
          question: req.body.pollQuestion,
          options: options.map((text: string) => ({ text, votes: [] })),
          endsAt: new Date(Date.now() + durationHours * 60 * 60 * 1000),
        };
      }
    }

    const post = await Post.create({
      userId,
      content,
      mediaIPFSHash,
      contentHash,
      visibility,
      ...(pollData ? { poll: pollData } : {}),
    });

    const blockchainTxHash = await createPostOnChain(
      post._id.toString(),
      contentHash,
      VISIBILITY_MAP[visibility] ?? 0
    );

    if (blockchainTxHash) {
      post.blockchainTxHash = blockchainTxHash;
      post.blockchainPostId = ethers.keccak256(ethers.toUtf8Bytes(post._id.toString()));
      await post.save();
    }

    notifyMentions(content, userId, post._id.toString()).catch((err) =>
      logger.warn("Mention notification failed:", err)
    );

    (async () => {
      try {
        const textResult = await analyzeCredibility(content);
        let finalScore = textResult.credibilityScore;

        if (req.file) {
          const imgResult = await analyzeImage(req.file.path);
          if (imgResult.analyzed && imgResult.score >= 0 && finalScore >= 0) {
            finalScore = Math.round(finalScore * 0.7 + imgResult.score * 0.3);
          }
        }

        if (finalScore >= 0) {
          post.credibilityScore = finalScore;
          post.isVerified = finalScore >= 70;
          await post.save();
        }
      } catch (err) {
        logger.warn("Credibility analysis failed:", err);
      }
    })();

    const populated = await Post.findById(post._id).populate("userId", "username avatar walletAddress");

    const io = getSocketIO();
    if (io && visibility === "public") {
      io.emit("new-post", populated);
    }

    res.status(201).json({ post: populated });
  } catch (error) {
    next(error);
  }
}

export async function getFeed(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(userId);
    if (!currentUser) throw new AppError("User not found", 404);

    const followingIds = currentUser.following;

    const posts = await Post.find({
      $or: [
        { visibility: "public" },
        { userId, visibility: { $in: ["public", "followers", "private"] } },
        { userId: { $in: followingIds }, visibility: { $in: ["public", "followers"] } },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "username avatar walletAddress reputationScore")
      .populate("comments.userId", "username avatar");

    const total = await Post.countDocuments({
      $or: [
        { visibility: "public" },
        { userId, visibility: { $in: ["public", "followers", "private"] } },
        { userId: { $in: followingIds }, visibility: { $in: ["public", "followers"] } },
      ],
    });

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPostById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const post = await Post.findById(req.params.id)
      .populate("userId", "username avatar walletAddress reputationScore")
      .populate("comments.userId", "username avatar");

    if (!post) throw new AppError("Post not found", 404);

    res.json({ post });
  } catch (error) {
    next(error);
  }
}

export async function likePost(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError("Post not found", 404);

    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId) as any;
    } else {
      post.likes.push(userId as any);

      if (post.userId.toString() !== userId) {
        await Notification.create({
          userId: post.userId,
          fromUserId: userId,
          type: "like",
          referenceId: post._id.toString(),
          message: "liked your post",
        });

        const io = getSocketIO();
        if (io) {
          io.to(post.userId.toString()).emit("notification", {
            type: "like",
            postId: post._id,
            fromUserId: userId,
          });
        }
      }
    }

    await post.save();
    res.json({ likes: post.likes.length, liked: !alreadyLiked });
  } catch (error) {
    next(error);
  }
}

export async function addComment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError("Post not found", 404);

    post.comments.push({ userId: userId as any, text, createdAt: new Date() });
    await post.save();

    notifyMentions(text, userId, post._id.toString()).catch((err) =>
      logger.warn("Comment mention notification failed:", err)
    );

    if (post.userId.toString() !== userId) {
      await Notification.create({
        userId: post.userId,
        fromUserId: userId,
        type: "comment",
        referenceId: post._id.toString(),
        message: "commented on your post",
      });

      const io = getSocketIO();
      if (io) {
        io.to(post.userId.toString()).emit("notification", {
          type: "comment",
          postId: post._id,
          fromUserId: userId,
        });
      }
    }

    const updated = await Post.findById(post._id)
      .populate("userId", "username avatar")
      .populate("comments.userId", "username avatar");

    res.status(201).json({ post: updated });
  } catch (error) {
    next(error);
  }
}

export async function getUserPosts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    let visibilityFilter: any;
    if (targetUserId === currentUserId) {
      visibilityFilter = {};
    } else {
      const currentUser = await User.findById(currentUserId);
      const isFollowing = currentUser?.following.some((id) => id.toString() === targetUserId);
      visibilityFilter = isFollowing
        ? { visibility: { $in: ["public", "followers"] } }
        : { visibility: "public" };
    }

    const posts = await Post.find({ userId: targetUserId, ...visibilityFilter })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "username avatar walletAddress reputationScore")
      .populate("comments.userId", "username avatar");

    res.json({ posts });
  } catch (error) {
    next(error);
  }
}

export async function reactToPost(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { type } = req.body;
    const validTypes = ["like", "love", "laugh", "wow", "angry", "sad"];
    if (!validTypes.includes(type)) throw new AppError("Invalid reaction type", 400);

    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError("Post not found", 404);

    const existingIdx = post.reactions.findIndex(
      (r) => r.userId.toString() === userId
    );

    if (existingIdx >= 0) {
      if (post.reactions[existingIdx].type === type) {
        post.reactions.splice(existingIdx, 1);
      } else {
        post.reactions[existingIdx].type = type as any;
      }
    } else {
      post.reactions.push({ userId: userId as any, type: type as any });

      if (post.userId.toString() !== userId) {
        await Notification.create({
          userId: post.userId,
          fromUserId: userId,
          type: "like",
          referenceId: post._id.toString(),
          message: `reacted ${type} to your post`,
        });
        const io = getSocketIO();
        if (io) {
          io.to(post.userId.toString()).emit("notification", {
            type: "like",
            postId: post._id,
            fromUserId: userId,
          });
        }
      }
    }

    await post.save();

    const reactionSummary: Record<string, number> = {};
    for (const r of post.reactions) {
      reactionSummary[r.type] = (reactionSummary[r.type] || 0) + 1;
    }

    const myReaction = post.reactions.find((r) => r.userId.toString() === userId);

    res.json({
      reactions: post.reactions,
      reactionSummary,
      myReaction: myReaction?.type || null,
      totalReactions: post.reactions.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function votePoll(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { optionIndex } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError("Post not found", 404);
    if (!post.poll) throw new AppError("This post has no poll", 400);
    if (new Date() > post.poll.endsAt) throw new AppError("Poll has ended", 400);
    if (optionIndex < 0 || optionIndex >= post.poll.options.length) {
      throw new AppError("Invalid option index", 400);
    }

    for (const opt of post.poll.options) {
      opt.votes = opt.votes.filter((id) => id.toString() !== userId) as any;
    }

    post.poll.options[optionIndex].votes.push(userId as any);
    await post.save();

    res.json({ poll: post.poll });
  } catch (error) {
    next(error);
  }
}

export async function verifyPost(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError("Post not found", 404);

    if (!post.blockchainTxHash || !post.contentHash) {
      res.json({
        verified: false,
        reason: "Post not yet recorded on blockchain",
        blockchainTxHash: post.blockchainTxHash || null,
        contentHash: post.contentHash || null,
      });
      return;
    }

    const isIntact = await verifyPostIntegrity(post._id.toString(), post.contentHash);

    const currentHash = ethers.keccak256(ethers.toUtf8Bytes(post.content));
    const contentUnchanged = currentHash === post.contentHash;

    res.json({
      verified: isIntact && contentUnchanged,
      blockchainVerified: isIntact,
      contentIntact: contentUnchanged,
      blockchainTxHash: post.blockchainTxHash,
      contentHash: post.contentHash,
      currentContentHash: currentHash,
      timestamp: post.createdAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePost(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError("Post not found", 404);
    if (post.userId.toString() !== req.userId) {
      throw new AppError("Not authorized", 403);
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted" });
  } catch (error) {
    next(error);
  }
}
