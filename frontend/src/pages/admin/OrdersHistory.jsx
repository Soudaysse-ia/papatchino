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

      {/* Vue mobile : cartes empilées */}
      <div className="space-y-2 md:hidden">
        {orders.length === 0 && <p className="card p-6 text-center text-slate-400">Aucune commande.</p>}
        {orders.map((o) => (
          <div key={o.id} className="card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">#{o.id} · {SOURCE_LABELS[o.source]}</span>
              <span className={`badge ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(o.created_at)}{o.table_label ? ` · ${o.table_label}` : ''}</p>
            <ul className="mt-2 text-sm text-slate-600">
              {o.items.map((it, i) => (
                <li key={i}>
                  {it.qty}× {it.name}
                  {(it.options || []).length > 0 && (
                    <span className="text-slate-400"> ({it.options.map((op) => op.label).join(', ')})</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-sm text-slate-500">{PAYMENT_LABELS[o.payment_method] || 'Non payé'}</span>
              <span className="font-bold text-brand-600">{formatPrice(o.total_price)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Vue bureau : tableau */}
      <div className="card hidden overflow-x-auto md:block">
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
                <td className="p-3 text-slate-600">
                  {o.items.map((it, i) => (
                    <div key={i}>
                      {it.qty}× {it.name}
                      {(it.options || []).length > 0 && (
                        <span className="text-slate-400"> ({it.options.map((op) => op.label).join(', ')})</span>
                      )}
                    </div>
                  ))}
                </td>
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
