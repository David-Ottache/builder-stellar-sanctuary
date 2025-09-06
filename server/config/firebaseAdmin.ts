import { getFirebaseConfig } from "./firebase";

let admin: any = null;
let adminApp: any = null;

export async function initializeFirebaseAdmin(): Promise<{ app: any | null; initialized: boolean }> {
  if (adminApp) return { app: adminApp, initialized: true };

  const cfg = getFirebaseConfig();
  if (!cfg || (!cfg.serviceAccount && !(cfg.clientEmail && cfg.privateKey))) {
    console.warn("Firebase config not present; skipping firebase-admin initialization");
    return { app: null, initialized: false };
  }

  try {
    // dynamic import to support ESM firebase-admin builds
    const firebaseAdminModule = await import("firebase-admin");
    admin = firebaseAdminModule?.default || firebaseAdminModule;

    // If an app already exists, reuse it to avoid initializeApp conflicts
    const existingApps = typeof admin.getApps === "function" ? admin.getApps() : admin.apps || [];
    if (existingApps && existingApps.length > 0) {
      try {
        adminApp = typeof admin.getApp === "function" ? admin.getApp() : admin.app();
      } catch (e) {
        // fallback
        adminApp = admin.app();
      }
      console.log("ℹ️ Reusing existing Firebase admin app");
      return { app: adminApp, initialized: true };
    }

    const credential = cfg.serviceAccount
      ? admin.credential.cert(cfg.serviceAccount as any)
      : admin.credential.cert({
          projectId: cfg.projectId,
          clientEmail: cfg.clientEmail,
          privateKey: cfg.privateKey,
        });

    adminApp = admin.initializeApp({
      credential,
      storageBucket: cfg.storageBucket,
      databaseURL: cfg.databaseURL,
    });

    console.log("✅ Firebase admin initialized");
    return { app: adminApp, initialized: true };
  } catch (err: any) {
    console.warn("firebase-admin not available or failed to initialize:", err?.message || err);
    adminApp = null;
    admin = null;
    return { app: null, initialized: false };
  }
}

export function getAdmin(): any | null {
  return admin || null;
}

export function getFirestore(): any | null {
  // Prefer using admin.firestore() when available
  if (!admin) {
    console.warn("getFirestore called before firebase-admin initialization");
    return null;
  }
  try {
    return typeof admin.firestore === "function" ? admin.firestore() : adminApp?.firestore?.();
  } catch (err) {
    console.warn("Failed getting firestore() from admin or adminApp", err);
    return null;
  }
}

export function getAuth(): any | null {
  if (!admin) {
    console.warn("getAuth called before firebase-admin initialization");
    return null;
  }
  try {
    return typeof admin.auth === "function" ? admin.auth() : adminApp?.auth?.();
  } catch (err) {
    console.warn("Failed getting auth() from admin or adminApp", err);
    return null;
  }
}

export function isInitialized(): boolean {
  const apps = admin && (typeof admin.getApps === "function" ? admin.getApps() : admin.apps || []);
  return !!(adminApp || (apps && apps.length > 0));
}
