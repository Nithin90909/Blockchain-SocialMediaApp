import { Router } from "express";
import { getSettings, updateSettings, blockUser } from "../controllers/settings.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/", getSettings);
router.put("/", updateSettings);
router.post("/block/:id", blockUser);

export default router;
