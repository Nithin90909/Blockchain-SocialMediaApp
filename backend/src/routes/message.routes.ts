import { Router } from "express";
import { body } from "express-validator";
import { sendMessage, getConversation, getConversationList } from "../controllers/message.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  [
    body("receiverId").isString().notEmpty(),
    body("text").trim().isLength({ min: 1, max: 2000 }),
  ],
  validate,
  sendMessage
);

router.get("/conversations", getConversationList);
router.get("/:partnerId", getConversation);

export default router;
