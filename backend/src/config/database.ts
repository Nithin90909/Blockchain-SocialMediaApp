
import mongoose from "mongoose";
import { logger } from "./logger";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    logger.error("MONGODB_URI is missing from environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });

    logger.info("MongoDB Atlas connected successfully.");
  } catch (error) {
    logger.error("MongoDB connection failed:", error);
    process.exit(1);
  }

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error:", error);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected.");
  });
}
