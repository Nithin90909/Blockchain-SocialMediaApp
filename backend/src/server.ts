import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "../.env" });

import http from "http";
import app from "./app";
import { connectDB } from "./config/database";
import { initializeSocket } from "./sockets";
import { logger } from "./config/logger";

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  const server = http.createServer(app);
  initializeSocket(server);

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});
