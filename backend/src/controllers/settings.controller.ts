import { Response, NextFunction } from "express";
import User from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";

export async function getSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.userId).select(
      "privacySettings blockedUsers"
    );
    if (!user) throw new AppError("User not found", 404);

    const blocked = await User.find({
      _id: { $in: user.blockedUsers },
    }).select("username avatar");

    res.json({
      privacySettings: user.privacySettings,
      blockedUsers: blocked,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const {
      defaultVisibility,
      whoCanMessage,
      showOnlineStatus,
      showLastSeen,
      showReputationScore,
    } = req.body;

    const update: Record<string, any> = {};
    if (defaultVisibility !== undefined)
      update["privacySettings.defaultVisibility"] = defaultVisibility;
    if (whoCanMessage !== undefined)
      update["privacySettings.whoCanMessage"] = whoCanMessage;
    if (showOnlineStatus !== undefined)
      update["privacySettings.showOnlineStatus"] = showOnlineStatus;
    if (showLastSeen !== undefined)
      update["privacySettings.showLastSeen"] = showLastSeen;
    if (showReputationScore !== undefined)
      update["privacySettings.showReputationScore"] = showReputationScore;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    ).select("privacySettings");

    if (!user) throw new AppError("User not found", 404);

    res.json({ privacySettings: user.privacySettings });
  } catch (error) {
    next(error);
  }
}

export async function blockUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const targetId = req.params.id;

    if (userId === targetId) throw new AppError("Cannot block yourself", 400);

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const target = await User.findById(targetId);
    if (!target) throw new AppError("Target user not found", 404);

    const isBlocked = user.blockedUsers.some((id) => id.toString() === targetId);

    if (isBlocked) {
      user.blockedUsers = user.blockedUsers.filter(
        (id) => id.toString() !== targetId
      ) as any;
    } else {
      user.blockedUsers.push(targetId as any);
      user.following = user.following.filter(
        (id) => id.toString() !== targetId
      ) as any;
      target.followers = target.followers.filter(
        (id) => id.toString() !== userId
      ) as any;
      await target.save();
    }

    await user.save();

    const blocked = await User.find({
      _id: { $in: user.blockedUsers },
    }).select("username avatar");

    res.json({ blocked: !isBlocked, blockedUsers: blocked });
  } catch (error) {
    next(error);
  }
}
