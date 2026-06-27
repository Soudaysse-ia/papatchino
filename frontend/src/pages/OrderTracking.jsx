import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import { formatPrice } from '../lib/format.js';

// Étapes visibles côté client.
const STEPS = [
  { key: 'recue', label: 'Reçue', icon: '📥' },
  { key: 'en_preparation', label: 'En préparation', icon: '👨‍🍳' },
  { key: 'prete', label: 'Prête', icon: '🍽️' },
  { key: 'servie', label: 'Servie', icon: '✅' },
];

function stepIndex(status) {
  if (status === 'payee') return STEPS.length - 1; // payée = servie pour le client
  return STEPS.findIndex((s) => s.key === status);
}

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await api.get(`/orders/track/${id}`);
      setOrder(data);
    } catch {
      setError('Commande introuvable.');
    }
  }

  useEffect(() => {
    load();
    const socket = getSocket();
    const onUpdate = (o) => { if (String(o.id) === String(id)) setOrder((prev) => ({ ...prev, ...o })); };
    socket.on('order:updated', onUpdate);
    const poll = setInterval(load, 10000); // repli si websocket indisponible
    return () => { socket.off('order:updated', onUpdate); clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Link to="/menu" className="btn-primary mt-4">Retour au menu</Link>
      </div>
    );
  }
  if (!order) return <div className="p-8 text-center text-slate-500">Chargement…</div>;

  const current = stepIndex(order.status);
  const cancelled = order.status === 'annulee';

  return (
    <div className="mx-auto max-w-md p-4">
      <div className="card p-6">
        <div className="text-center">
          <p className="text-sm text-slate-500">Commande</p>
          <p className="text-4xl font-extrabold text-brand-600">#{order.id}</p>
          {order.table_label && <p className="mt-1 text-slate-600">{order.table_label}</p>}
        </div>

        {cancelled ? (
          <p className="mt-6 rounded-lg bg-red-50 px-3 py-3 text-center text-red-700">
            Cette commande a été annulée.
          </p>
        ) : (
          <div className="mt-8 space-y-1">
            {STEPS.map((step, i) => {
              const done = i < current;
              const active = i === current;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition
                      ${done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-500 text-white animate-pulse' : 'bg-slate-200 text-slate-400'}`}>
                      {done ? '✓' : step.icon}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`h-6 w-0.5 ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    )}
                  </div>
                  <span className={`font-medium ${active ? 'text-brand-700' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 border-t pt-4">
          <h3 className="mb-2 font-semibold text-slate-700">Votre commande</h3>
          <ul className="space-y-1 text-sm">
            {order.items.map((it, idx) => (
              <li key={idx}>
                <div className="flex justify-between">
                  <span>{it.qty}× {it.name}</span>
                  <span className="text-slate-500">{formatPrice(it.price * it.qty)}</span>
                </div>
                {(it.options || []).map((op, j) => (
                  <p key={j} className="pl-4 text-xs text-slate-400">• {op.label}</p>
                ))}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t pt-2 font-bold">
            <span>Total</span>
            <span>{formatPrice(order.total_price)}</span>
          </div>
        </div>
      </div>

      <Link to="/menu" className="btn-secondary mt-4 w-full">Commander à nouveau</Link>
      <p className="mt-3 text-center text-xs text-slate-400">Cette page se met à jour automatiquement.</p>
    </div>
  );
}
