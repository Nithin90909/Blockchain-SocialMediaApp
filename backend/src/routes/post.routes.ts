import { Router } from "express";
import { body } from "express-validator";
import {
  createPost,
  getFeed,
  getPostById,
  likePost,
  addComment,
  getUserPosts,
  deletePost,
  reactToPost,
  votePoll,
  verifyPost,
} from "../controllers/post.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { upload } from "../middleware/upload";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  upload.single("media"),
  [
    body("content").trim().isLength({ min: 1, max: 5000 }).withMessage("Content required (max 5000 chars)"),
    body("visibility").optional().isIn(["public", "followers", "private"]),
  ],
  validate,
  createPost
);

router.get("/feed", getFeed);
router.get("/:id", getPostById);
router.post("/:id/like", likePost);
router.post(
  "/:id/react",
  [body("type").isIn(["like", "love", "laugh", "wow", "angry", "sad"])],
  validate,
  reactToPost
);
router.post(
  "/:id/comment",
  [body("text").trim().isLength({ min: 1, max: 1000 }).withMessage("Comment text required (max 1000 chars)")],
  validate,
  addComment
);
router.post(
  "/:id/poll-vote",
  [body("optionIndex").isInt({ min: 0 })],
  validate,
  votePoll
);
router.get("/:id/verify", verifyPost);
router.get("/user/:userId", getUserPosts);
router.delete("/:id", deletePost);

export default router;
