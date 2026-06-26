import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { logAction } from '../audit.js';

const router = Router();

router.get('/', requireAuth('admin'), (req, res) => {
  const rows = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id').all();
  res.json(rows);
});

router.post('/', requireAuth('admin'), (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Identifiant, mot de passe et rôle requis' });
  }
  if (!['admin', 'cashier', 'kitchen'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Cet identifiant existe déjà' });
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, hash, role);
  logAction(req.user, 'utilisateur_creation', `Création du compte "${username}" (${role})`);
  res.status(201).json({ id: info.lastInsertRowid, username, role });
});

router.delete('/:id', requireAuth('admin'), (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
  logAction(req.user, 'utilisateur_suppression', `Suppression du compte "${target.username}"`);
  res.json({ ok: true });
});

export default router;
