import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { logAction } from '../audit.js';

const router = Router();

// Efface le journal d'audit (admin). Une entrée traçant l'effacement est conservée.
router.delete('/', requireAuth('admin'), (req, res) => {
  const info = db.prepare('DELETE FROM access_log').run();
  logAction(req.user, 'journal_effacement',
    `Journal d'audit effacé (${info.changes} entrée(s) supprimée(s))`);
  res.json({ ok: true, deleted: info.changes });
});

// Journal d'audit, filtrable (admin uniquement).
router.get('/', requireAuth('admin'), (req, res) => {
  const { action, user, date } = req.query;
  const clauses = [];
  const params = {};
  if (action) { clauses.push('action = @action'); params.action = action; }
  if (user) { clauses.push('username LIKE @user'); params.user = `%${user}%`; }
  if (date) { clauses.push("date(timestamp) = @date"); params.date = date; }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const rows = db.prepare(
    `SELECT * FROM access_log ${where} ORDER BY timestamp DESC LIMIT 1000`
  ).all(params);
  res.json(rows);
});

// Liste des types d'action présents (pour le filtre).
router.get('/actions', requireAuth('admin'), (req, res) => {
  const rows = db.prepare('SELECT DISTINCT action FROM access_log ORDER BY action').all();
  res.json(rows.map((r) => r.action));
});

export default router;
