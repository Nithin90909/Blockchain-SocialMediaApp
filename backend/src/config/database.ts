import mongoose from "mongoose";
import { logger } from "./logger";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<void> {
  let uri = process.env.MONGODB_URI || "mongodb://localhost:27017/decentra-social";

  // Use a short timeout for the initial connection attempt to avoid long hangs
  try {
    logger.info("Attempting connection to local MongoDB...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.warn("Local MongoDB connection failed, spinning up in-memory MongoDB server...");
    try {
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      await mongoose.connect(uri);
      logger.info(`In-memory MongoDB connected successfully at ${uri}`);
    } catch (innerError) {
      logger.error("Failed to start in-memory MongoDB server:", innerError);
      process.exit(1);
    }
  }

  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });
}
