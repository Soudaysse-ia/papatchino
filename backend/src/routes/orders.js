import { Router } from 'express';
import db from '../db.js';
import { requireAuth, verifyToken } from '../auth.js';
import { logAction } from '../audit.js';

const router = Router();

const STATUS_LABELS = {
  recue: 'Reçue',
  en_preparation: 'En préparation',
  prete: 'Prête',
  servie: 'Servie',
  payee: 'Payée',
  annulee: 'Annulée',
};

// Tente de lire l'utilisateur connecté sans l'exiger (commandes client = anonymes).
function optionalUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

// Création d'une commande.
// - source qr_table : publique (client). table identifiée par qr token.
// - walk_in / delivery : réservé au staff (caisse/admin).
router.post('/', (req, res) => {
  const b = req.body || {};
  const user = optionalUser(req);
  const source = b.source || 'qr_table';

  if (source !== 'qr_table' && (!user || !['admin', 'cashier'].includes(user.role))) {
    return res.status(403).json({ error: 'Seul le personnel peut créer ce type de commande' });
  }

  // Déduplication (synchronisation hors ligne) : même client_uid => on renvoie l'existant.
  if (b.client_uid) {
    const dup = db.prepare('SELECT * FROM orders WHERE client_uid = ?').get(b.client_uid);
    if (dup) return res.status(200).json(serialize(dup));
  }

  const requested = Array.isArray(b.items) ? b.items : [];
  if (requested.length === 0) {
    return res.status(400).json({ error: 'La commande est vide' });
  }

  // Résolution de la table (via token QR ou id).
  let table = null;
  if (b.table_token) {
    table = db.prepare('SELECT * FROM tables WHERE qr_code_token = ?').get(b.table_token);
  } else if (b.table_id) {
    table = db.prepare('SELECT * FROM tables WHERE id = ?').get(b.table_id);
  }

  try {
    const result = db.transaction(() => {
      const lineItems = [];
      let total = 0;
      for (const it of requested) {
        const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(it.id);
        if (!menuItem) throw httpError(400, `Plat introuvable (id ${it.id})`);
        const qty = Math.max(1, parseInt(it.qty, 10) || 1);
        if (!menuItem.is_available) throw httpError(409, `"${menuItem.name}" n'est plus disponible`);
        if (menuItem.stock_quantity < qty) {
          throw httpError(409, `Stock insuffisant pour "${menuItem.name}" (reste ${menuItem.stock_quantity})`);
        }
        const newStock = menuItem.stock_quantity - qty;
        const stillAvailable = newStock > 0 ? menuItem.is_available : 0;
        db.prepare('UPDATE menu_items SET stock_quantity = ?, is_available = ? WHERE id = ?')
          .run(newStock, stillAvailable, menuItem.id);
        lineItems.push({ id: menuItem.id, name: menuItem.name, price: menuItem.price, qty });
        total += menuItem.price * qty;
      }

      const info = db.prepare(`
        INSERT INTO orders (client_uid, source, table_id, table_label, items, total_price, payment_method, status, note, handled_by)
        VALUES (@client_uid, @source, @table_id, @table_label, @items, @total_price, @payment_method, @status, @note, @handled_by)
      `).run({
        client_uid: b.client_uid || null,
        source,
        table_id: table?.id ?? null,
        table_label: table?.name ?? (b.table_label || ''),
        items: JSON.stringify(lineItems),
        total_price: Math.round(total * 100) / 100,
        payment_method: b.payment_method || null,
        status: 'recue',
        note: b.note || '',
        handled_by: user?.id ?? null,
      });
      return db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
    })();

    logAction(user, 'commande_creation',
      `Commande #${result.id} (${source}) - ${result.total_price} - ${result.table_label || 'sur place'}`);

    const io = req.app.get('io');
    io?.emit('order:new', serialize(result));
    notifyLowStock(io);

    res.status(201).json(serialize(result));
  } catch (e) {
    if (e.httpStatus) return res.status(e.httpStatus).json({ error: e.message });
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la création de la commande' });
  }
});

// Suivi public d'une commande (client).
router.get('/track/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  const s = serialize(order);
  res.json({ id: s.id, status: s.status, status_label: s.status_label, table_label: s.table_label, items: s.items, total_price: s.total_price, created_at: s.created_at });
});

// Flux des commandes (staff) avec filtres.
router.get('/', requireAuth('admin', 'cashier', 'kitchen'), (req, res) => {
  const { status, date, table, payment_method, active } = req.query;
  const clauses = [];
  const params = {};
  if (status) { clauses.push('status = @status'); params.status = status; }
  if (payment_method) { clauses.push('payment_method = @payment_method'); params.payment_method = payment_method; }
  if (table) { clauses.push('table_label LIKE @table'); params.table = `%${table}%`; }
  if (date) { clauses.push("date(created_at) = @date"); params.date = date; }
  if (active === '1') { clauses.push("status IN ('recue','en_preparation','prete')"); }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const rows = db.prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT 500`).all(params);
  res.json(rows.map(serialize));
});

// Mise à jour du statut.
router.patch('/:id/status', requireAuth('admin', 'cashier', 'kitchen'), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  const status = req.body?.status;
  if (!STATUS_LABELS[status]) return res.status(400).json({ error: 'Statut invalide' });

  // La cuisine ne peut pas encaisser.
  if (req.user.role === 'kitchen' && ['payee'].includes(status)) {
    return res.status(403).json({ error: 'La cuisine ne peut pas encaisser' });
  }

  db.prepare('UPDATE orders SET status = ?, updated_at = datetime(\'now\'), handled_by = ? WHERE id = ?')
    .run(status, req.user.id, order.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  logAction(req.user, 'commande_statut',
    `Commande #${order.id} : ${STATUS_LABELS[order.status]} → ${STATUS_LABELS[status]}`);
  req.app.get('io')?.emit('order:updated', serialize(updated));
  res.json(serialize(updated));
});

// Encaissement : définit le mode de paiement et passe en "payee".
router.patch('/:id/pay', requireAuth('admin', 'cashier'), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  const method = req.body?.payment_method;
  if (!['cash', 'mobile_money'].includes(method)) {
    return res.status(400).json({ error: 'Mode de paiement invalide' });
  }
  db.prepare('UPDATE orders SET payment_method = ?, status = \'payee\', updated_at = datetime(\'now\'), handled_by = ? WHERE id = ?')
    .run(method, req.user.id, order.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  logAction(req.user, 'commande_paiement',
    `Commande #${order.id} encaissée (${method === 'cash' ? 'Espèces' : 'Mobile Money'}) - ${updated.total_price}`);
  req.app.get('io')?.emit('order:updated', serialize(updated));
  res.json(serialize(updated));
});

function serialize(o) {
  return {
    ...o,
    items: safeParse(o.items),
    status_label: STATUS_LABELS[o.status] || o.status,
  };
}
function safeParse(s) { try { return JSON.parse(s); } catch { return []; } }
function httpError(status, message) { const e = new Error(message); e.httpStatus = status; return e; }

function notifyLowStock(io) {
  if (!io) return;
  const low = db.prepare('SELECT id, name, stock_quantity, low_stock_threshold FROM menu_items WHERE stock_quantity <= low_stock_threshold').all();
  if (low.length) io.emit('stock:low', low);
}

export default router;
