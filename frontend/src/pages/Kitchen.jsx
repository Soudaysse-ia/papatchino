import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { getSocket } from '../lib/socket.js';
import { playAlert, unlockAudio } from '../lib/sound.js';
import { elapsed, formatTime, SOURCE_LABELS } from '../lib/format.js';
import OnlineBadge from '../components/OnlineBadge.jsx';

// L'écran cuisine n'affiche que les commandes à préparer (reçue / en préparation / prête).
const KITCHEN_STATUSES = ['recue', 'en_preparation', 'prete'];

export default function Kitchen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [flash, setFlash] = useState(false);
  const [, setTick] = useState(0); // rafraîchit le minuteur
  const seen = useRef(new Set());

  async function load() {
    try {
      const data = await api.get('/orders?active=1');
      const kitchen = data.filter((o) => KITCHEN_STATUSES.includes(o.status));
      setOrders(kitchen);
      kitchen.forEach((o) => seen.current.add(o.id));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load();
    const socket = getSocket();
    const onNew = (order) => {
      if (!KITCHEN_STATUSES.includes(order.status)) return;
      if (seen.current.has(order.id)) return;
      seen.current.add(order.id);
      setOrders((prev) => [...prev, order]);
      triggerAlert();
    };
    const onUpdated = (order) => {
      setOrders((prev) => {
        if (!KITCHEN_STATUSES.includes(order.status)) return prev.filter((o) => o.id !== order.id);
        const exists = prev.some((o) => o.id === order.id);
        return exists ? prev.map((o) => (o.id === order.id ? order : o)) : [...prev, order];
      });
    };
    const onReset = () => load();
    socket.on('order:new', onNew);
    socket.on('order:updated', onUpdated);
    socket.on('orders:reset', onReset);
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => { socket.off('order:new', onNew); socket.off('order:updated', onUpdated); socket.off('orders:reset', onReset); clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function triggerAlert() {
    playAlert();
    setFlash(true);
    setTimeout(() => setFlash(false), 4000);
  }

  async function setStatus(order, status) {
    try { await api.patch(`/orders/${order.id}/status`, { status }); }
    catch (e) { alert(e.message); }
  }

  // Tri : plus ancienne en premier.
  const sorted = [...orders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="min-h-full bg-slate-900 text-slate-100" onClick={unlockAudio}>
      {flash && <div className="pointer-events-none fixed inset-0 z-50 animate-flash" />}

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Écran Cuisine</h1>
          <OnlineBadge />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">{user?.username}</span>
          <button className="btn-secondary py-1" onClick={() => { logout(); navigate('/connexion'); }}>Déconnexion</button>
        </div>
      </header>

      <main className="p-4">
        {sorted.length === 0 ? (
          <p className="py-20 text-center text-slate-500">Aucune commande à préparer.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((o) => {
              const mins = Math.floor((Date.now() - new Date(o.created_at.replace(' ', 'T') + 'Z')) / 60000);
              const urgent = mins >= 10;
              return (
                <div key={o.id} className={`rounded-xl border-2 p-4 ${urgent ? 'border-red-500 bg-slate-800' : 'border-slate-700 bg-slate-800'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xl font-extrabold">#{o.id}</p>
                      <p className="text-sm text-slate-400">{o.table_label || SOURCE_LABELS[o.source]}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${urgent ? 'text-red-400' : 'text-emerald-400'}`}>{elapsed(o.created_at)}</p>
                      <p className="text-xs text-slate-500">{formatTime(o.created_at)}</p>
                    </div>
                  </div>
                  {o.note && <p className="mt-2 rounded bg-amber-500/20 px-2 py-1 text-sm text-amber-300">📝 {o.note}</p>}
                  <ul className="mt-3 space-y-1 text-lg">
                    {o.items.map((it, i) => (
                      <li key={i}>
                        <div className="flex gap-2">
                          <span className="font-bold text-brand-400">{it.qty}×</span>
                          <span>{it.name}</span>
                        </div>
                        {(it.options || []).map((op, j) => (
                          <p key={j} className="pl-7 text-sm text-gold-300">• {op.label}</p>
                        ))}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex gap-2">
                    {o.status === 'recue' && (
                      <button className="btn-secondary flex-1 py-2" onClick={() => setStatus(o, 'en_preparation')}>Commencer</button>
                    )}
                    {o.status !== 'prete' ? (
                      <button className="btn-success flex-1 py-2" onClick={() => setStatus(o, 'prete')}>Prête ✓</button>
                    ) : (
                      <span className="flex-1 rounded-lg bg-purple-500/20 py-2 text-center font-semibold text-purple-300">Prête — en attente de service</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
