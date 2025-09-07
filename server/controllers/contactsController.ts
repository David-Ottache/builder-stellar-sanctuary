import { RequestHandler } from "express";
import { initializeFirebaseAdmin, getFirestore, isInitialized } from "../config/firebaseAdmin";

async function ensureDb() {
  if (!isInitialized()) {
    const init = await initializeFirebaseAdmin();
    if (!init.initialized) return null;
  }
  return getFirestore();
}

export const addContact: RequestHandler = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { name, phone, relationship } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'user id required' });
    if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });

    const db = await ensureDb();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const payload = { userId, name, phone, relationship: relationship || null, createdAt: new Date().toISOString() };
    const docRef = await db.collection('contacts').add(payload);
    return res.status(201).json({ message: 'Contact added', id: docRef.id, contact: { id: docRef.id, ...payload } });
  } catch (e) {
    console.error('addContact error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const listContacts: RequestHandler = async (req, res) => {
  try {
    const { id: userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'user id required' });

    const db = await ensureDb();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const q = await db.collection('contacts').where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    const contacts = q.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    return res.json({ contacts });
  } catch (e) {
    console.error('listContacts error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const deleteContact: RequestHandler = async (req, res) => {
  try {
    const { id: userId, contactId } = req.params as any;
    if (!userId || !contactId) return res.status(400).json({ error: 'user id and contact id required' });

    const db = await ensureDb();
    if (!db) return res.status(503).json({ error: 'database not available' });

    const docRef = db.collection('contacts').doc(contactId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Contact not found' });
    const data: any = doc.data();
    if (data.userId !== userId) return res.status(403).json({ error: 'Not allowed' });

    await docRef.delete();
    return res.json({ message: 'Deleted' });
  } catch (e) {
    console.error('deleteContact error', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
