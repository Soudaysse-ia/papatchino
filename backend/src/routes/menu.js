import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { logAction } from '../audit.js';

const router = Router();

const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');

// Téléversement d'une photo de plat (admin). Reçoit une image en base64 (data URL),
// déjà compressée côté client, et la sauvegarde comme fichier servi via /uploads.
router.post('/upload', requireAuth('admin'), (req, res) => {
  const dataUrl = req.body?.dataUrl || '';
  const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(dataUrl);
  if (!m) return res.status(400).json({ error: 'Image invalide (formats acceptés : JPG, PNG, WebP)' });
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > 4 * 1024 * 1024) {
    return res.status(413).json({ error: 'Image trop volumineuse (max 4 Mo)' });
  }
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `${uuidv4()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  logAction(req.user, 'menu_photo', `Téléversement d'une photo (${filename})`);
  res.status(201).json({ url: `/uploads/${filename}` });
});

// Ordre d'affichage des catégories (les plats salés d'abord, desserts/brioches/boissons à la fin).
const CATEGORY_ORDER = `CASE category
  WHEN 'Smash Burgers' THEN 1
  WHEN 'Sandwichs' THEN 2
  WHEN 'Frites Signature' THEN 3
  WHEN 'Grillades' THEN 4
  WHEN 'Les Planchas' THEN 5
  WHEN 'Crêpes / Gaufres' THEN 6
  WHEN 'Brioche Perdue' THEN 7
  WHEN 'Boissons' THEN 9
  ELSE 8 END`;
const MENU_ORDER = `ORDER BY ${CATEGORY_ORDER}, name`;

// Liste publique du menu (clients). Seuls les articles existants, ordonnés par catégorie.
router.get('/', (req, res) => {
  const items = db.prepare(`SELECT * FROM menu_items ${MENU_ORDER}`).all();
  res.json(items.map(serialize));
});

// Liste complète pour le staff (inclut stock détaillé).
router.get('/manage', requireAuth('admin', 'cashier', 'kitchen'), (req, res) => {
  const items = db.prepare(`SELECT * FROM menu_items ${MENU_ORDER}`).all();
  res.json(items.map(serialize));
});

router.post('/', requireAuth('admin'), (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Le nom est requis' });
  const info = db.prepare(`
    INSERT INTO menu_items (name, description, price, category, photo_url, is_available, stock_quantity, low_stock_threshold, options)
    VALUES (@name, @description, @price, @category, @photo_url, @is_available, @stock_quantity, @low_stock_threshold, @options)
  `).run({
    name: b.name,
    description: b.description || '',
    price: Number(b.price) || 0,
    category: b.category || 'Autres',
    photo_url: b.photo_url || '',
    is_available: b.is_available === false ? 0 : 1,
    stock_quantity: Number.isFinite(+b.stock_quantity) ? +b.stock_quantity : 0,
    low_stock_threshold: Number.isFinite(+b.low_stock_threshold) ? +b.low_stock_threshold : 5,
    options: JSON.stringify(Array.isArray(b.options) ? b.options : []),
  });
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(info.lastInsertRowid);
  logAction(req.user, 'menu_ajout', `Ajout du plat "${item.name}"`);
  emitMenu(req);
  res.status(201).json(serialize(item));
});

router.put('/:id', requireAuth('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Plat introuvable' });
  const b = req.body || {};
  const merged = {
    name: b.name ?? existing.name,
    description: b.description ?? existing.description,
    price: b.price != null ? Number(b.price) : existing.price,
    category: b.category ?? existing.category,
    photo_url: b.photo_url ?? existing.photo_url,
    is_available: b.is_available != null ? (b.is_available ? 1 : 0) : existing.is_available,
    stock_quantity: b.stock_quantity != null ? +b.stock_quantity : existing.stock_quantity,
    low_stock_threshold: b.low_stock_threshold != null ? +b.low_stock_threshold : existing.low_stock_threshold,
    options: b.options != null ? JSON.stringify(Array.isArray(b.options) ? b.options : []) : existing.options,
    id: existing.id,
  };
  // Si on remet du stock, on peut réactiver l'article.
  if (b.stock_quantity != null && merged.stock_quantity > 0 && b.is_available == null) {
    merged.is_available = 1;
  }
  db.prepare(`
    UPDATE menu_items SET name=@name, description=@description, price=@price, category=@category,
      photo_url=@photo_url, is_available=@is_available, stock_quantity=@stock_quantity,
      low_stock_threshold=@low_stock_threshold, options=@options WHERE id=@id
  `).run(merged);
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(existing.id);
  logAction(req.user, 'menu_modif', `Modification du plat "${item.name}"`);
  emitMenu(req);
  res.json(serialize(item));
});

// Bascule disponibilité instantanée (admin + caisse).
router.patch('/:id/availability', requireAuth('admin', 'cashier'), (req, res) => {
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Plat introuvable' });
  const available = req.body?.is_available ? 1 : 0;
  db.prepare('UPDATE menu_items SET is_available = ? WHERE id = ?').run(available, item.id);
  logAction(req.user, 'menu_disponibilite',
    `"${item.name}" marqué ${available ? 'disponible' : 'indisponible'}`);
  emitMenu(req);
  res.json(serialize({ ...item, is_available: available }));
});

router.delete('/:id', requireAuth('admin'), (req, res) => {
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Plat introuvable' });
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(item.id);
  logAction(req.user, 'menu_suppression', `Suppression du plat "${item.name}"`);
  emitMenu(req);
  res.json({ ok: true });
});

function serialize(i) {
  return {
    ...i,
    is_available: !!i.is_available,
    low_stock: i.stock_quantity <= i.low_stock_threshold,
    options: safeParseOptions(i.options),
  };
}

function safeParseOptions(s) {
  if (Array.isArray(s)) return s;
  try { return JSON.parse(s || '[]'); } catch { return []; }
}

function emitMenu(req) {
  req.app.get('io')?.emit('menu:updated');
}

export default router;
