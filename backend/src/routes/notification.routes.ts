import { Router } from "express";
import { getNotifications, markAsRead } from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/", getNotifications);
router.patch("/:notificationId/read", markAsRead);

export default router;
