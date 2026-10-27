import { Router } from "express";
import {
  getProfile,
  updateProfile,
  followUser,
  searchUsers,
  getSuggestedUsers,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

router.use(authenticate);

router.get("/search", searchUsers);
router.get("/suggested", getSuggestedUsers);
router.get("/:id", getProfile);
router.put("/profile", upload.single("avatar"), updateProfile);
router.post("/:id/follow", followUser);

export default router;
