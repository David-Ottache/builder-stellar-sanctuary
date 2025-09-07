import { RequestHandler } from "express";
import { initializeFirebaseAdmin, getFirestore, isInitialized } from "../config/firebaseAdmin";

export const lookupById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id required' });

    if (!isInitialized()) {
      const init = await initializeFirebaseAdmin();
      if (!init.initialized) {
        return res.status(503).json({ error: 'database not available' });
      }
    }

    const db = getFirestore();
    if (!db) return res.status(503).json({ error: 'database not available' });

    // try drivers by doc id
    const driverDoc = await db.collection('drivers').doc(id).get();
    if (driverDoc.exists) {
      const data: any = driverDoc.data();
      return res.json({ driver: { id: driverDoc.id, ...data } });
    }

    // try users by doc id
    const userDoc = await db.collection('users').doc(id).get();
    if (userDoc.exists) {
      const data: any = userDoc.data();
      return res.json({ user: { id: userDoc.id, ...data } });
    }

    // fallback: query drivers where stored 'id' field equals param
    const dq = await db.collection('drivers').where('id', '==', id).limit(1).get();
    if (!dq.empty) {
      const d = dq.docs[0];
      return res.json({ driver: { id: d.id, ...(d.data() as any) } });
    }

    // fallback: query users where stored 'id' field equals param
    const uq = await db.collection('users').where('id', '==', id).limit(1).get();
    if (!uq.empty) {
      const u = uq.docs[0];
      return res.json({ user: { id: u.id, ...(u.data() as any) } });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('lookupById error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
