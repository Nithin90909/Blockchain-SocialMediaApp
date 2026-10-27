import { Router } from "express";
import { body } from "express-validator";
import {
  createStory,
  getStories,
  viewStory,
  reactToStory,
  deleteStory,
} from "../controllers/story.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { upload } from "../middleware/upload";

const router = Router();

router.use(authenticate);

router.post("/", upload.single("media"), createStory);
router.get("/", getStories);
router.post("/:id/view", viewStory);
router.post(
  "/:id/react",
  [body("emoji").isString().isLength({ min: 1, max: 10 })],
  validate,
  reactToStory
);
router.delete("/:id", deleteStory);

export default router;
