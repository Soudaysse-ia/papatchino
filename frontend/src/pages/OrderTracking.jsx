import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import { formatPrice } from '../lib/format.js';

// Étapes visibles côté client.
const STEPS_TABLE = [
  { key: 'recue', label: 'Reçue', desc: 'Votre commande est bien arrivée', icon: '📥' },
  { key: 'en_preparation', label: 'En préparation', desc: 'Nos cuisiniers s\'en occupent', icon: '👨‍🍳' },
  { key: 'prete', label: 'Prête', desc: 'Ça sort de la cuisine !', icon: '🍽️' },
  { key: 'servie', label: 'Servie', desc: 'Bon appétit !', icon: '✅' },
];
const STEPS_TAKEAWAY = [
  { key: 'recue', label: 'Reçue', desc: 'Votre commande est bien arrivée', icon: '📥' },
  { key: 'en_preparation', label: 'En préparation', desc: 'Nos cuisiniers s\'en occupent', icon: '👨‍🍳' },
  { key: 'prete', label: 'Prête à récupérer', desc: 'Venez récupérer votre commande au comptoir !', icon: '🛍️' },
  { key: 'servie', label: 'Récupérée', desc: 'Bon appétit !', icon: '✅' },
];

function stepIndex(steps, status) {
  if (status === 'payee') return steps.length - 1; // payée = servie pour le client
  return steps.findIndex((s) => s.key === status);
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
      <div className="min-h-full bg-[#FBF3E4] p-6">
        <div className="mx-auto max-w-md pt-16 text-center">
          <p className="text-4xl">🧐</p>
          <p className="mt-3 font-display text-xl text-slate-600">{error}</p>
          <Link to="/menu" className="mt-6 inline-block rounded-full bg-brand-600 px-8 py-3 font-bold text-white transition hover:bg-brand-700 active:scale-95">
            Retour au menu
          </Link>
        </div>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-full bg-[#FBF3E4] p-8 text-center text-slate-500">Chargement…</div>
    );
  }

  const isTakeaway = order.source === 'walk_in';
  const STEPS = isTakeaway ? STEPS_TAKEAWAY : STEPS_TABLE;
  const current = stepIndex(STEPS, order.status);
  const cancelled = order.status === 'annulee';

  return (
    <div className="min-h-full bg-[#FBF3E4] pb-10">
      {/* Bandeau haut */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 px-4 pb-16 pt-5 text-center text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1.2px, transparent 0)', backgroundSize: '20px 20px' }} />
        <img src="/logo.svg" alt="Papatchino" className="relative mx-auto h-9 w-auto rounded-lg bg-white px-2 py-1 shadow" />
        <p className="relative mt-5 text-xs uppercase tracking-widest text-white/60">
          {isTakeaway ? 'Commande à emporter' : 'Votre commande'}
        </p>
        <p className="relative font-display text-5xl text-gold-400 drop-shadow-sm">#{order.id}</p>
        {order.table_label && <p className="relative mt-1 text-sm text-white/80">{order.table_label}</p>}
        {isTakeaway && order.customer_name && (
          <p className="relative mt-1 text-sm text-white/80">👤 {order.customer_name}</p>
        )}
        {isTakeaway && order.pickup_time && (
          <p className="relative mt-1 text-sm text-gold-300 font-semibold">🕐 Retrait prévu à {order.pickup_time}</p>
        )}
        <svg aria-hidden className="absolute inset-x-0 bottom-0 h-7 w-full text-[#FBF3E4]" viewBox="0 0 1440 48" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,48 L0,22 C240,46 480,6 720,18 C960,30 1200,10 1440,26 L1440,48 Z" />
        </svg>
      </header>

      <div className="mx-auto max-w-md px-4">
        {/* Progression */}
        <div className="-mt-8 animate-fade-up rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(125,60,20,0.12)] ring-1 ring-black/5">
          {cancelled ? (
            <p className="rounded-2xl bg-red-50 px-4 py-4 text-center font-semibold text-red-700">
              Cette commande a été annulée.
            </p>
          ) : (
            <div className="space-y-0.5">
              {STEPS.map((step, i) => {
                const done = i < current;
                const active = i === current;
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`grid h-11 w-11 place-items-center rounded-full text-lg transition ${
                        done ? 'bg-emerald-500 text-white'
                        : active ? 'bg-brand-600 text-white shadow-lg shadow-brand-200 ring-4 ring-gold-300/60'
                        : 'bg-slate-100 text-slate-400'
                      } ${active ? 'animate-pulse' : ''}`}>
                        {done ? '✓' : step.icon}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`w-1 flex-1 rounded-full ${done ? 'bg-emerald-400' : 'bg-slate-100'}`} style={{ minHeight: 22 }} />
                      )}
                    </div>
                    <div className="pb-5 pt-1.5">
                      <p className={`font-display text-lg leading-none ${
                        active ? 'text-brand-700' : done ? 'text-slate-700' : 'text-slate-300'
                      }`}>
                        {step.label}
                      </p>
                      {active && <p className="mt-1 text-sm text-slate-500">{step.desc}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Détail de la commande */}
        <div className="mt-4 animate-fade-up rounded-3xl bg-white p-5 shadow-[0_6px_24px_rgba(125,60,20,0.08)] ring-1 ring-black/5" style={{ animationDelay: '120ms' }}>
          <h3 className="font-display text-lg text-slate-800">Votre commande</h3>
          <svg width="60" height="8" viewBox="0 0 60 8" className="mb-3 mt-1 text-gold-500" aria-hidden>
            <path d="M2 5 C11 1, 20 7, 30 4 C40 1, 49 7, 58 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
          <ul className="space-y-2 text-sm">
            {order.items.map((it, idx) => (
              <li key={idx}>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>{it.qty}× {it.name}</span>
                  <span className="text-slate-500">{formatPrice(it.price * it.qty)}</span>
                </div>
                {(it.options || []).map((op, j) => (
                  <p key={j} className="pl-4 text-xs text-slate-400">• {op.label}</p>
                ))}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
            <span className="font-bold text-slate-700">Total</span>
            <span className="font-display text-xl text-brand-600">{formatPrice(order.total_price)}</span>
          </div>
        </div>

        <Link to="/menu"
          className="mt-4 block w-full rounded-full bg-white py-3 text-center font-bold text-brand-700 shadow-sm ring-1 ring-black/5 transition hover:bg-gold-50 active:scale-95">
          Commander à nouveau
        </Link>
        <p className="mt-3 text-center text-xs text-slate-400">Cette page se met à jour automatiquement.</p>
      </div>
    </div>
  );
}
