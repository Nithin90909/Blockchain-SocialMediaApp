import { Router } from "express";
import { body } from "express-validator";
import { register, login, getMe } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post(
  "/register",
  [
    body("username").trim().isLength({ min: 3, max: 32 }).withMessage("Username must be 3-32 characters"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("walletAddress").isString().notEmpty().withMessage("Wallet address required"),
  ],
  validate,
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  validate,
  login
);

router.get("/me", authenticate, getMe);

export default router;
