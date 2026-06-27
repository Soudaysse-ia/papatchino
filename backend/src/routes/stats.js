import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const PAID = "status = 'payee'";

function dayParam(req) {
  return req.query.date || new Date().toISOString().slice(0, 10);
}

// Tableau de bord du jour.
router.get('/dashboard', requireAuth('admin'), (req, res) => {
  const day = dayParam(req);
  const dateFilter = "date(created_at) = @day";

  const totals = db.prepare(`
    SELECT COUNT(*) AS orders_count,
           COALESCE(SUM(CASE WHEN ${PAID} THEN total_price ELSE 0 END), 0) AS revenue
    FROM orders WHERE ${dateFilter}
  `).get({ day });

  const byPayment = db.prepare(`
    SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(total_price),0) AS revenue
    FROM orders WHERE ${dateFilter} AND ${PAID}
    GROUP BY payment_method
  `).all({ day });

  const cash = byPayment.find((r) => r.payment_method === 'cash') || { count: 0, revenue: 0 };
  const mobile = byPayment.find((r) => r.payment_method === 'mobile_money') || { count: 0, revenue: 0 };

  // Articles les plus commandés (toutes commandes du jour, hors annulées).
  const orders = db.prepare(
    `SELECT items FROM orders WHERE ${dateFilter} AND status != 'annulee'`
  ).all({ day });
  const tally = {};
  for (const o of orders) {
    let items = [];
    try { items = JSON.parse(o.items); } catch { /* ignore */ }
    for (const it of items) {
      tally[it.name] = (tally[it.name] || 0) + (it.qty || 0);
    }
  }
  const topItems = Object.entries(tally)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  // Heures de pointe (nombre de commandes par heure).
  const byHourRaw = db.prepare(`
    SELECT strftime('%H', created_at) AS hour, COUNT(*) AS count
    FROM orders WHERE ${dateFilter} GROUP BY hour
  `).all({ day });
  const byHour = Array.from({ length: 24 }, (_, h) => {
    const hh = String(h).padStart(2, '0');
    const found = byHourRaw.find((r) => r.hour === hh);
    return { hour: hh, count: found ? found.count : 0 };
  });

  // Alertes de stock bas.
  const lowStock = db.prepare(
    'SELECT id, name, stock_quantity, low_stock_threshold, is_available FROM menu_items WHERE stock_quantity <= low_stock_threshold ORDER BY stock_quantity'
  ).all().map((i) => ({ ...i, is_available: !!i.is_available }));

  res.json({
    date: day,
    orders_count: totals.orders_count,
    revenue: totals.revenue,
    payments: {
      cash: { count: cash.count, revenue: cash.revenue },
      mobile_money: { count: mobile.count, revenue: mobile.revenue },
    },
    top_items: topItems,
    by_hour: byHour,
    low_stock: lowStock,
  });
});

// Export CSV des commandes d'une journée.
router.get('/export.csv', requireAuth('admin'), (req, res) => {
  const day = dayParam(req);
  const rows = db.prepare(
    "SELECT * FROM orders WHERE date(created_at) = ? ORDER BY created_at"
  ).all(day);
  const header = ['ID', 'Date', 'Source', 'Table', 'Articles', 'Total', 'Paiement', 'Statut'];
  const lines = [header.join(';')];
  const sourceLabel = { qr_table: 'QR Table', walk_in: 'Sur place', delivery: 'Livraison' };
  const payLabel = { cash: 'Espèces', mobile_money: 'Mobile Money' };
  const statusLabel = { recue: 'Reçue', en_preparation: 'En préparation', prete: 'Prête', servie: 'Servie', payee: 'Payée', annulee: 'Annulée' };
  for (const o of rows) {
    let items = [];
    try { items = JSON.parse(o.items); } catch { /* ignore */ }
    const itemsStr = items.map((i) => {
      const opts = (i.options || []).map((o) => o.label).join(' / ');
      return `${i.qty}x ${i.name}${opts ? ` [${opts}]` : ''}`;
    }).join(', ');
    lines.push([
      o.id, o.created_at, sourceLabel[o.source] || o.source, o.table_label || '',
      `"${itemsStr.replace(/"/g, '""')}"`, o.total_price,
      payLabel[o.payment_method] || '', statusLabel[o.status] || o.status,
    ].join(';'));
  }
  const csv = '﻿' + lines.join('\n'); // BOM pour Excel
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="rapport-${day}.csv"`);
  res.send(csv);
});

export default router;
