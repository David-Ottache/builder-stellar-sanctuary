import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { registerDriver } from "./controllers/driverController";
import { verifyDriverOtp } from "./routes/verifyOtp";
import { loginDriver } from "./controllers/loginHandler";
import { setDriverPassword } from "./controllers/setPasswordHandler";
import { registerUser } from "./controllers/userController";
import { loginUser } from "./controllers/userLoginHandler";
import { setUserPassword } from "./controllers/setUserPasswordHandler";
import { verifyUserOtp } from "./routes/verifyUserOtp";
import { initializeFirebaseAdmin, isInitialized } from "./config/firebaseAdmin";
import * as contactsController from "./controllers/contactsController";
import { getUser } from "./controllers/userController";
import { getDriver } from "./controllers/driverController";
import * as walletController from "./controllers/walletController";

export async function createServer() {
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

  // init Sentry if DSN provided
  try {
    if (process.env.SENTRY_DSN) {
      // dynamic import to avoid hard dependency when DSN not set
      (async () => {
        try {
          const Sentry = await import("@sentry/node");
          Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.2 });
          app.use(Sentry.Handlers.requestHandler());
          app.use(Sentry.Handlers.errorHandler());
          console.log("Sentry initialized for server");
        } catch (e) {
          console.warn("Failed to init Sentry (server):", e);
        }
      })();
    }
  } catch (e) {
    console.warn("Sentry init check failed", e);
  }

  // Ensure firebase-admin is attempted before handling API requests (idempotent)
  app.use(async (req, _res, next) => {
    try {
      if (req.path && req.path.startsWith("/api")) {
        try {
          const { initializeFirebaseAdmin, isInitialized } = await import(
            "./config/firebaseAdmin"
          );
          if (!isInitialized()) {
            await initializeFirebaseAdmin();
          }
        } catch (e) {
          console.warn("Background firebase init failed in middleware", e);
        }
      }
    } catch (e) {}
    next();
  });

  // simple request logger for /api calls
  app.use((req, _res, next) => {
    try {
      if (req.path && req.path.startsWith("/api"))
        console.debug("incoming api request", req.method, req.path);
    } catch (e) {}
    next();
  });
  // Allow large JSON payloads (base64 images from client) — increase limit as needed
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Quick logging for POST /api/users/register to help debug client-side timeouts
  app.post("/api/users/register", (req, res, next) => {
    try {
      console.log(
        "Incoming /api/users/register request — headers:",
        Object.keys(req.headers).length ? "[headers present]" : "no-headers",
      );
      console.log(
        "Incoming /api/users/register body preview:",
        typeof req.body === "object"
          ? Object.keys(req.body).slice(0, 10)
          : typeof req.body,
      );
    } catch (e) {}
    next();
  });

  // Simple echo endpoint for connectivity testing
  app.post("/api/echo", (req, res) => {
    try {
      console.log(
        "Echo received body keys:",
        typeof req.body === "object"
          ? Object.keys(req.body).slice(0, 10)
          : typeof req.body,
      );
    } catch (e) {}
    res.json({
      ok: true,
      bodyPreview:
        typeof req.body === "object"
          ? Object.keys(req.body).slice(0, 10)
          : typeof req.body,
    });
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Driver registration
  app.post("/api/drivers/register", registerDriver);

  // Login
  app.post("/api/drivers/login", loginDriver);

  // Set password for existing account
  app.post("/api/drivers/set-password", setDriverPassword);

  // User routes
  app.post("/api/users/register", registerUser);
  app.post("/api/users/login", loginUser);
  app.post("/api/users/set-password", setUserPassword);
  app.post("/api/users/verify", verifyUserOtp);
  app.get("/api/users/:id", getUser as any);

  // Driver routes
  app.post("/api/drivers/register", registerDriver);
  // Login
  app.post("/api/drivers/login", loginDriver);

  // Set password for existing account
  app.post("/api/drivers/set-password", setDriverPassword);

  // Verify OTP
  app.post("/api/drivers/verify", verifyDriverOtp);

  // Get driver
  app.get("/api/drivers/:id", getDriver as any);
  // Rate driver
  app.post(
    "/api/drivers/:id/rate",
    (await import("./controllers/driverController")).rateDriver as any,
  );

  // Contacts (per-user emergency contacts)
  app.post("/api/users/:id/contacts", contactsController.addContact as any);
  app.get("/api/users/:id/contacts", contactsController.listContacts as any);
  app.delete(
    "/api/users/:id/contacts/:contactId",
    contactsController.deleteContact as any,
  );

  // Wallet routes
  app.post("/api/wallet/transfer", walletController.transferFunds as any);
  app.post("/api/wallet/topup", walletController.topUp as any);
  app.post("/api/wallet/request", walletController.requestFunds as any);
  app.get("/api/wallet/requests/:userId", walletController.listRequests as any);
  app.post("/api/wallet/deduct", walletController.deductFunds as any);
  app.get(
    "/api/wallet/transactions/:userId",
    walletController.getTransactions as any,
  );

  // Trip routes
  const tripController = await import("./controllers/tripController");
  app.post("/api/trips", tripController.createTrip as any);
  app.get("/api/trips/:userId", tripController.listTrips as any);
  app.get("/api/trip/:id", tripController.getTripById as any);
  app.get(
    "/api/trips/driver/:driverId",
    tripController.listTripsByDriver as any,
  );
  app.get("/api/trips/average", tripController.averageCost as any);
  app.post("/api/trips/:id/end", tripController.endTrip as any);
  app.post("/api/trips/:id/rate", tripController.rateTrip as any);

  // Presence (online users/drivers)
  const presenceController = await import("./controllers/presenceController");
  app.post("/api/presence", presenceController.setPresence as any);
  app.get("/api/presence", presenceController.listPresence as any);
  // SSE stream for low-latency presence updates
  app.get("/api/presence/stream", presenceController.streamPresence as any);

  // Ride request routes
  const rideRequestController = await import(
    "./controllers/rideRequestController"
  );
  app.post("/api/ride-requests", rideRequestController.createRequest as any);
  app.get(
    "/api/ride-requests",
    rideRequestController.listRequestsByDriver as any,
  );
  app.get("/api/ride-requests/:id", rideRequestController.getRequest as any);
  app.post(
    "/api/ride-requests/:id/accept",
    rideRequestController.acceptRequest as any,
  );
  app.post(
    "/api/ride-requests/:id/decline",
    rideRequestController.declineRequest as any,
  );

  // Lookup endpoint: search both drivers and users by id (document id or stored 'id' field)
  const lookupController = await import("./controllers/lookupController");
  app.get("/api/lookup/:id", lookupController.lookupById as any);

  // Admin endpoints (no auth applied here)
  const adminController = await import("./controllers/adminController");
  app.get("/api/admin/users", adminController.listUsers as any);
  app.get("/api/admin/drivers", adminController.listDrivers as any);
  app.get("/api/admin/trips", adminController.listTrips as any);
  app.get("/api/admin/commissions", adminController.listCommissions as any);

  // Safety: send test SOS via SMS (Twilio)
  const safetyController = await import("./controllers/safetyController");
  app.post("/api/safety", safetyController.sendTestSOS as any);

  // Settings (admin-configurable, with in-memory fallback)
  const settingsController = await import("./controllers/settingsController");
  app.get("/api/settings", settingsController.getSettings as any);
  app.put("/api/settings", settingsController.updateSettings as any);

  return app;
}
