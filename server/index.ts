import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { registerDriver } from "./controllers/driverController";
import { initializeFirebaseAdmin, isInitialized } from "./config/firebaseAdmin";

export function createServer() {
  const app = express();

  // Try to initialize firebase-admin (no-op if not configured or dependency missing)
  try {
    const init = initializeFirebaseAdmin();
    if (init.initialized) {
      console.log("Firebase admin initialized at server startup");
    } else {
      console.log("Firebase admin not initialized (not configured or missing dependency)");
    }
  } catch (err) {
    console.warn("Error initializing firebase-admin:", err);
  }

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Driver registration
  app.post("/api/drivers/register", registerDriver);

  return app;
}
