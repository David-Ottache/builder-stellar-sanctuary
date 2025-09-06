import { getFirebaseConfig, isFirebaseConfigured } from "./firebase";

let adminApp: any | null = null;
let admin: any | null = null;

export function initializeFirebaseAdmin(): { app: any | null; initialized: boolean } {
  if (adminApp) return { app: adminApp, initialized: true };

  if (!isFirebaseConfigured()) {
    console.warn("Firebase not configured via env vars; skipping initialization.");
    return { app: null, initialized: false };
  }

  try {
    // Dynamically require firebase-admin so the project doesn't need it unless used
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    admin = require("firebase-admin");

    const cfg = getFirebaseConfig();

    const credentialOptions: any = {};

    if (cfg.serviceAccount) {
      credentialOptions.credential = admin.credential.cert(cfg.serviceAccount);
    } else if (cfg.clientEmail && cfg.privateKey) {
      credentialOptions.credential = admin.credential.cert({
        projectId: cfg.projectId,
        clientEmail: cfg.clientEmail,
        privateKey: cfg.privateKey,
      });
    } else {
      // fallback to default credentials if available in environment
      credentialOptions.credential = admin.credential.applicationDefault();
    }

    if (cfg.databaseURL) {
      credentialOptions.databaseURL = cfg.databaseURL;
    }

    adminApp = admin.initializeApp(credentialOptions);

    console.log("✅ Firebase admin initialized");
    return { app: adminApp, initialized: true };
  } catch (err: any) {
    console.error("Failed to initialize firebase-admin:", err?.message || err);
    adminApp = null;
    return { app: null, initialized: false };
  }
}

export function getAdmin(): any | null {
  return admin || null;
}

export function getFirestore() {
  if (!adminApp && !initializeFirebaseAdmin().initialized) return null;
  return adminApp.firestore();
}

export function getAuth() {
  if (!adminApp && !initializeFirebaseAdmin().initialized) return null;
  return adminApp.auth();
}

export function isInitialized(): boolean {
  return !!adminApp;
}
