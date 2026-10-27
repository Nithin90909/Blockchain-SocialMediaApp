import { Router } from "express";
import { body } from "express-validator";
import { createReport, voteOnReport, getReports } from "../controllers/moderation.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate);

router.post(
  "/report",
  [
    body("postId").isString().notEmpty(),
    body("reason").trim().isLength({ min: 5, max: 500 }),
  ],
  validate,
  createReport
);

router.post("/:reportId/vote", [body("vote").isIn(["fake", "legitimate"])], validate, voteOnReport);
router.get("/reports", getReports);

export default router;
