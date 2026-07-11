import { useEffect, useState } from 'react';
import { api, getToken } from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { formatPrice } from '../../lib/format.js';

export default function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try { setData(await api.get(`/stats/dashboard?date=${date}`)); }
    catch (e) { setError(e.message); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => load();
    socket.on('order:new', refresh);
    socket.on('order:updated', refresh);
    socket.on('stock:low', refresh);
    return () => { socket.off('order:new', refresh); socket.off('order:updated', refresh); socket.off('stock:low', refresh); };
    // eslint-disable-next-line
  }, [date]);

  async function resetDay() {
    if (!confirm(`Supprimer définitivement TOUTES les commandes du ${date} ?\n\nLes statistiques de cette journée repartiront à zéro et les commandes disparaîtront de la caisse, de la cuisine et de l'historique. Cette action est irréversible.`)) return;
    try {
      const r = await api.del(`/orders/day?date=${date}`);
      alert(`${r.deleted} commande(s) supprimée(s). La journée est réinitialisée.`);
      load();
    } catch (e) { alert(e.message); }
  }

  async function exportCsv() {
    const res = await fetch(`/api/stats/export.csv?date=${date}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) { alert('Export impossible'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rapport-${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Chargement…</p>;

  const maxHour = Math.max(1, ...data.by_hour.map((h) => h.count));
  const maxItem = Math.max(1, ...data.top_items.map((i) => i.qty));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Date :</label>
          <input type="date" className="input w-auto" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={exportCsv}>Exporter CSV</button>
          <button className="btn-secondary" onClick={() => window.print()}>Imprimer / PDF</button>
          <button className="btn-danger" onClick={resetDay}>Réinitialiser la journée</button>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Commandes du jour" value={data.orders_count} />
        <StatCard label="Recettes du jour" value={formatPrice(data.revenue)} accent />
        <StatCard label="Espèces" value={formatPrice(data.payments.cash.revenue)} sub={`${data.payments.cash.count} paiement(s)`} />
        <StatCard label="Mobile Money" value={formatPrice(data.payments.mobile_money.revenue)} sub={`${data.payments.mobile_money.count} paiement(s)`} />
      </div>

      {/* Alertes de stock */}
      {data.low_stock.length > 0 && (
        <div className="card border-amber-300 bg-amber-50 p-4">
          <h2 className="mb-2 font-bold text-amber-800">⚠️ Alertes de stock</h2>
          <div className="flex flex-wrap gap-2">
            {data.low_stock.map((s) => (
              <span key={s.id} className={`badge ${s.stock_quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                {s.name} : {s.stock_quantity === 0 ? 'épuisé' : `${s.stock_quantity} restant(s)`}
                {s.stock_quantity === 0 && ' (indisponible)'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Articles les plus commandés */}
        <div className="card p-4">
          <h2 className="mb-3 font-bold text-slate-700">Articles les plus commandés</h2>
          {data.top_items.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune donnée.</p>
          ) : (
            <div className="space-y-2">
              {data.top_items.map((it) => (
                <div key={it.name}>
                  <div className="flex justify-between text-sm">
                    <span>{it.name}</span><span className="font-semibold">{it.qty}</span>
                  </div>
                  <div className="h-2 rounded bg-slate-100">
                    <div className="h-2 rounded bg-brand-500" style={{ width: `${(it.qty / maxItem) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Heures de pointe */}
        <div className="card p-4">
          <h2 className="mb-3 font-bold text-slate-700">Heures de pointe</h2>
          <div className="flex h-40 items-end gap-0.5">
            {data.by_hour.map((h) => (
              <div key={h.hour} className="flex flex-1 flex-col items-center justify-end" title={`${h.hour}h : ${h.count} commande(s)`}>
                <div className="w-full rounded-t bg-brand-400" style={{ height: `${(h.count / maxHour) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`card p-4 ${accent ? 'bg-brand-600 text-white' : ''}`}>
      <p className={`text-sm ${accent ? 'text-brand-100' : 'text-slate-500'}`}>{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {sub && <p className={`text-xs ${accent ? 'text-brand-100' : 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}
