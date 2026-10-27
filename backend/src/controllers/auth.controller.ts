import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { registerUserOnChain } from "../services/blockchain.service";
import { logger } from "../config/logger";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: (JWT_EXPIRY || "7d") as any });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password, walletAddress } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { walletAddress }],
    });

    if (existingUser) {
      throw new AppError("User with this email, username, or wallet already exists", 409);
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      walletAddress: walletAddress.toLowerCase(),
    });

    const txHash = await registerUserOnChain(username);
    if (txHash) {
      logger.info(`User ${username} registered on blockchain: ${txHash}`);
    }

    const token = generateToken(user._id.toString());

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletAddress: user.walletAddress,
        reputationScore: user.reputationScore,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id.toString());

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletAddress: user.walletAddress,
        reputationScore: user.reputationScore,
        bio: user.bio,
        avatar: user.avatar || "",
      },
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const user = await User.findById(userId)
      .select("-password")
      .populate("followers", "username avatar")
      .populate("following", "username avatar");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletAddress: user.walletAddress,
        reputationScore: user.reputationScore,
        bio: user.bio,
        avatar: user.avatar || "",
        followers: user.followers,
        following: user.following,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}
