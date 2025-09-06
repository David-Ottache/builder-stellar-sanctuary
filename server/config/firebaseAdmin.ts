import admin from "firebase-admin";
import { getFirebaseConfig } from "/config/firebase";

const cfg = getFirebaseConfig();

if (cfg.serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(cfg.serviceAccount as any),
    storageBucket: cfg.storageBucket,
    databaseURL: cfg.databaseURL,
  });
}