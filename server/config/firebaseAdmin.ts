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

    if (cfg.serviceAccount) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(cfg.serviceAccount as any),
        storageBucket: cfg.storageBucket,
        databaseURL: cfg.databaseURL,
      });
    } else {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: cfg.projectId,
          clientEmail: cfg.clientEmail,
          privateKey: cfg.privateKey,
        }),
        storageBucket: cfg.storageBucket,
        databaseURL: cfg.databaseURL,
      });
    }

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
  if (!adminApp) {
    // initialization might be async; caller should call initializeFirebaseAdmin() first
    console.warn("getFirestore called before firebase-admin initialization");
    return null;
  }
  try {
    return adminApp.firestore();
  } catch (err) {
    console.warn("Failed getting firestore() from adminApp", err);
    return null;
  }
}

export function getAuth(): any | null {
  if (!adminApp) {
    console.warn("getAuth called before firebase-admin initialization");
    return null;
  }
  try {
    return adminApp.auth();
  } catch (err) {
    console.warn("Failed getting auth() from adminApp", err);
    return null;
  }
}

export function isInitialized(): boolean {
  return !!adminApp;
}
