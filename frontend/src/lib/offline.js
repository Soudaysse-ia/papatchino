import { openDB } from 'idb';
import { api } from './api.js';

// File d'attente locale (IndexedDB) pour les commandes créées hors ligne.
const DB_NAME = 'resto-offline';
const STORE = 'pending_orders';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'client_uid' });
      }
    },
  });
}

export function newClientUid() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'uid-' + Date.now() + '-' + Math.random().toString(16).slice(2));
}

export async function queueOrder(order) {
  const db = await getDB();
  await db.put(STORE, { ...order, queued_at: Date.now() });
}

export async function getQueued() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function removeQueued(clientUid) {
  const db = await getDB();
  await db.delete(STORE, clientUid);
}

export async function queueCount() {
  const db = await getDB();
  return db.count(STORE);
}

// Tente d'envoyer toutes les commandes en attente. Renvoie le nombre synchronisé.
export async function syncQueue() {
  if (!navigator.onLine) return 0;
  const pending = await getQueued();
  let synced = 0;
  for (const order of pending) {
    try {
      await api.post('/orders', order);
      await removeQueued(order.client_uid);
      synced += 1;
    } catch (e) {
      // 4xx (sauf réseau) => commande invalide : on la retire pour ne pas bloquer la file.
      if (e.status && e.status >= 400 && e.status < 500 && e.status !== 408) {
        await removeQueued(order.client_uid);
      } else {
        break; // problème réseau : on réessaiera plus tard.
      }
    }
  }
  if (synced > 0) window.dispatchEvent(new CustomEvent('queue:synced', { detail: { synced } }));
  return synced;
}
