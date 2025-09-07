import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { registerDriver } from "./controllers/driverController";
import { verifyDriverOtp } from "./routes/verifyOtp";
import { loginDriver } from "./controllers/loginHandler";
import { initializeFirebaseAdmin, isInitialized } from "./config/firebaseAdmin";

export function createServer() {
  const app = express();

  // Try to initialize firebase-admin (no-op if not configured or dependency missing)
  try {
    // initialize in background; initializeFirebaseAdmin is async
    initializeFirebaseAdmin()
      .then((init) => {
        if (init.initialized) {
          console.log("Firebase admin initialized at server startup");
        } else {
          console.log(
            "Firebase admin not initialized (not configured or missing dependency)",
          );
        }
      })
      .catch((err) => {
        console.warn("Error initializing firebase-admin:", err);
      });
  } catch (err) {
    console.warn("Error initializing firebase-admin:", err);
  }

  // Middleware
  app.use(cors());
  // Allow large JSON payloads (base64 images from client) — increase limit as needed
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Driver registration
  app.post("/api/drivers/register", registerDriver);

  // Login
  const { loginDriver } = await import('./controllers/loginHandler');
  app.post('/api/drivers/login', loginDriver);

  // Verify OTP
  app.post("/api/drivers/verify", verifyDriverOtp);

  return app;
}
