import { Response, NextFunction } from "express";
import Notification from "../models/Notification";
import { AuthRequest } from "../middleware/auth";

export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("fromUserId", "username avatar");

    const unreadCount = await Notification.countDocuments({ userId, read: false });

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { notificationId } = req.params;

    if (notificationId === "all") {
      await Notification.updateMany({ userId, read: false }, { read: true });
    } else {
      await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true }
      );
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
