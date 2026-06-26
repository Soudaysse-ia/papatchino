import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import {
  formatPrice, formatDateTime, STATUS_LABELS, STATUS_COLORS, PAYMENT_LABELS, SOURCE_LABELS,
} from '../../lib/format.js';

export default function OrdersHistory() {
  const [filters, setFilters] = useState({ date: '', table: '', status: '', payment_method: '' });
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v); });
    try { setOrders(await api.get(`/orders?${qs.toString()}`)); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters]);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Historique des commandes</h1>

      <div className="card grid gap-3 p-4 sm:grid-cols-4">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={filters.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className="label">Table</label>
          <input className="input" value={filters.table} onChange={(e) => set('table', e.target.value)} placeholder="Nom de table" />
        </div>
        <div>
          <label className="label">Statut</label>
          <select className="input" value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Paiement</label>
          <select className="input" value={filters.payment_method} onChange={(e) => set('payment_method', e.target.value)}>
            <option value="">Tous</option>
            <option value="cash">Espèces</option>
            <option value="mobile_money">Mobile Money</option>
          </select>
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">#</th><th className="p-3">Date</th><th className="p-3">Source</th>
              <th className="p-3">Table</th><th className="p-3">Articles</th><th className="p-3">Total</th>
              <th className="p-3">Paiement</th><th className="p-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t align-top">
                <td className="p-3 font-medium">{o.id}</td>
                <td className="p-3 whitespace-nowrap text-slate-500">{formatDateTime(o.created_at)}</td>
                <td className="p-3">{SOURCE_LABELS[o.source]}</td>
                <td className="p-3">{o.table_label || '—'}</td>
                <td className="p-3 text-slate-600">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</td>
                <td className="p-3 font-semibold">{formatPrice(o.total_price)}</td>
                <td className="p-3">{PAYMENT_LABELS[o.payment_method] || '—'}</td>
                <td className="p-3"><span className={`badge ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-slate-400">Aucune commande.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
