/**
 * Firebase configuration helper.
 *
 * This file only gathers configuration from environment variables and
 * exposes a structured config object. It does NOT import or initialize
 * the firebase or firebase-admin SDKs to avoid introducing a runtime
 * dependency at this point. To initialize Firebase in the server, call
 * `getFirebaseConfig()` and pass the returned values to your firebase
 * initializer (for example, firebase-admin.initializeApp(...)).
 *
 * Secrets should be provided via environment variables or a secure
 * secret manager. Avoid committing service account JSON to the repo.
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
  // full service account object if provided via JSON string in env
  serviceAccount?: FirebaseServiceAccount;
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

  // Some deploy environments require escaping newlines in private keys.
  if (privateKey && privateKey.indexOf("\\n") !== -1) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  let serviceAccount: FirebaseServiceAccount | undefined;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      serviceAccount = JSON.parse(raw) as FirebaseServiceAccount;
      // If service account contains a private_key with escaped newlines, fix it.
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
      // ignore parse errors; serviceAccount remains undefined
      console.warn(
        "Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:",
        (e as Error).message,
      );
    }
  }

  return {
    projectId,
    databaseURL,
    storageBucket,
    clientEmail,
    privateKey,
    serviceAccount,
  };
}

export function isFirebaseConfigured(): boolean {
  const cfg = getFirebaseConfig();
  return !!(
    cfg.serviceAccount ||
    (cfg.projectId && (cfg.clientEmail || cfg.privateKey))
  );
}
