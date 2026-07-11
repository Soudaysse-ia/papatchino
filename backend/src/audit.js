import db from './db.js';

let insertLog = null;

// Enregistre une action dans le journal d'audit.
// user peut être null (ex. commande client via QR).
// Les actions du compte propriétaire (super-admin) ne sont jamais enregistrées.
export function logAction(user, action, details = '') {
  if (user?.is_super) return;
  if (!insertLog) {
    insertLog = db.prepare(
      `INSERT INTO access_log (user_id, username, action, details) VALUES (?, ?, ?, ?)`
    );
  }
  insertLog.run(
    user?.id ?? null,
    user?.username ?? 'client',
    action,
    typeof details === 'string' ? details : JSON.stringify(details)
  );
}
