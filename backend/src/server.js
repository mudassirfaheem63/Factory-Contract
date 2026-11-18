require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const { startPurchaseListener } = require("./services/blockchainService");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`API server running at http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });

    if (process.env.ENABLE_EVENT_LISTENER === "true") {
      startPurchaseListener();
    }

    const shutdown = (signal) => {
      console.log(`${signal} received. Closing server...`);
      server.close(() => process.exit(0));
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
