import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { logAction } from '../audit.js';

const router = Router();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

router.get('/', requireAuth('admin', 'cashier'), (req, res) => {
  const rows = db.prepare('SELECT * FROM tables ORDER BY id').all();
  res.json(rows.map((t) => ({ ...t, menu_url: menuUrl(t.qr_code_token) })));
});

router.post('/', requireAuth('admin'), (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Le nom de la table est requis' });
  const token = uuidv4();
  const info = db.prepare('INSERT INTO tables (name, qr_code_token) VALUES (?, ?)').run(name, token);
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(info.lastInsertRowid);
  logAction(req.user, 'table_creation', `Création de la table "${name}"`);
  res.status(201).json({ ...table, menu_url: menuUrl(table.qr_code_token) });
});

router.delete('/:id', requireAuth('admin'), (req, res) => {
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!table) return res.status(404).json({ error: 'Table introuvable' });
  db.prepare('DELETE FROM tables WHERE id = ?').run(table.id);
  logAction(req.user, 'table_suppression', `Suppression de la table "${table.name}"`);
  res.json({ ok: true });
});

// Renvoie le QR code en PNG (dataURL) pointant vers le menu de la table.
router.get('/:id/qrcode', requireAuth('admin'), async (req, res) => {
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!table) return res.status(404).json({ error: 'Table introuvable' });
  const url = menuUrl(table.qr_code_token);
  const dataUrl = await QRCode.toDataURL(url, { width: 600, margin: 2 });
  res.json({ table: table.name, url, dataUrl });
});

function menuUrl(token) {
  return `${CLIENT_ORIGIN}/menu?table=${token}`;
}

export default router;
