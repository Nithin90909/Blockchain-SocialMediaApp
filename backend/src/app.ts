
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import authRoutes from "./routes/auth.routes";
import postRoutes from "./routes/post.routes";
import userRoutes from "./routes/user.routes";
import messageRoutes from "./routes/message.routes";
import moderationRoutes from "./routes/moderation.routes";
import notificationRoutes from "./routes/notification.routes";
import storyRoutes from "./routes/story.routes";
import settingsRoutes from "./routes/settings.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Allow requests from the deployed frontend and local development.
const allowedOrigins = [
  "https://blockchain-socialmediaapp-1.onrender.com",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"))
);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/settings", settingsRoutes);

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "DecentraSocial Backend API",
    status: "running",
    health: "/api/health",
    frontend:
      process.env.CLIENT_URL ||
      "https://blockchain-socialmediaapp-1.onrender.com",
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Error handler must remain last.
app.use(errorHandler);

export default app;
