/**
 * Firebase configuration helper.
 *
 * This file gathers configuration from environment variables and
 * exposes a structured config object for both Firebase Admin SDK
 * (server-side) and Firebase JS SDK (client-side).
 *
 * Admin SDK: uses service account or private key + client email.
 * Client SDK: uses web API key + app info.
 */

export interface FirebaseServiceAccount {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
}

export interface FirebaseConfig {
  projectId?: string;
  databaseURL?: string;
  storageBucket?: string;
  clientEmail?: string;
  privateKey?: string; // raw value, may include literal \n
  serviceAccount?: FirebaseServiceAccount;

  // --- Client SDK fields ---
  apiKey?: string;
  authDomain?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export function getFirebaseConfig(): FirebaseConfig {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Fix escaped newlines in private key
  if (privateKey && privateKey.indexOf("\\n") !== -1) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  let serviceAccount: FirebaseServiceAccount | undefined;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      serviceAccount = JSON.parse(raw) as FirebaseServiceAccount;
      if (
        serviceAccount.private_key &&
        serviceAccount.private_key.indexOf("\\n") !== -1
      ) {
        serviceAccount.private_key = serviceAccount.private_key.replace(
          /\\n/g,
          "\n",
        );
      }
    } catch (e) {
      console.warn(
        "Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:",
        (e as Error).message,
      );
    }
  }

  // Client-side Firebase SDK config
  const apiKey = process.env.FIREBASE_API_KEY;
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN;
  const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.FIREBASE_APP_ID;
  const measurementId = process.env.FIREBASE_MEASUREMENT_ID;

  return {
    projectId,
    databaseURL,
    storageBucket,
    clientEmail,
    privateKey,
    serviceAccount,
    apiKey,
    authDomain,
    messagingSenderId,
    appId,
    measurementId,
  };
}

export function isFirebaseConfigured(): boolean {
  const cfg = getFirebaseConfig();
  return !!(
    cfg.serviceAccount ||
    (cfg.projectId && (cfg.clientEmail || cfg.privateKey)) ||
    cfg.apiKey // allow detection if only client SDK is provided
  );
}
