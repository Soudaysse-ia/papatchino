import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { getSocket } from '../lib/socket.js';
import { playAlert, unlockAudio } from '../lib/sound.js';
import {
  formatPrice, formatTime, elapsed, STATUS_LABELS, STATUS_COLORS, PAYMENT_LABELS, SOURCE_LABELS,
} from '../lib/format.js';
import { hasOptions, unitPrice, optionLines, lineKey, emptySelection } from '../lib/cart.js';
import OnlineBadge from '../components/OnlineBadge.jsx';
import OptionPicker from '../components/OptionPicker.jsx';

export default function Cashier() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [flash, setFlash] = useState(false);
  const [payFor, setPayFor] = useState(null); // commande à encaisser
  const seen = useRef(new Set());

  async function loadOrders() {
    try {
      const data = await api.get('/orders?active=1');
      setOrders(data);
      data.forEach((o) => seen.current.add(o.id));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadOrders();
    const socket = getSocket();
    const onNew = (order) => {
      if (seen.current.has(order.id)) return;
      seen.current.add(order.id);
      setOrders((prev) => [order, ...prev]);
      triggerAlert();
    };
    const onUpdated = (order) => {
      setOrders((prev) => {
        // La commande reste sur le tableau jusqu'à l'encaissement (payee) ou l'annulation.
        const active = ['recue', 'en_preparation', 'prete', 'servie'].includes(order.status);
        const exists = prev.some((o) => o.id === order.id);
        if (!active) return prev.filter((o) => o.id !== order.id);
        if (exists) return prev.map((o) => (o.id === order.id ? order : o));
        return [order, ...prev];
      });
    };
    const onReset = () => loadOrders();
    socket.on('order:new', onNew);
    socket.on('order:updated', onUpdated);
    socket.on('orders:reset', onReset);
    return () => { socket.off('order:new', onNew); socket.off('order:updated', onUpdated); socket.off('orders:reset', onReset); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function triggerAlert() {
    playAlert();
    setFlash(true);
    setTimeout(() => setFlash(false), 4000);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }

  async function updateStatus(order, status) {
    try {
      await api.patch(`/orders/${order.id}/status`, { status });
    } catch (e) { alert(e.message); }
  }

  async function pay(order, method) {
    try {
      await api.patch(`/orders/${order.id}/pay`, { payment_method: method });
      setPayFor(null);
    } catch (e) { alert(e.message); }
  }

  return (
    <div className="min-h-full" onClick={unlockAudio}>
      {/* Bandeau d'alerte clignotant */}
      {flash && (
        <div className="pointer-events-none fixed inset-0 z-50 animate-flash" />
      )}

      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-brand-700">Caisse</h1>
          <OnlineBadge />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{user?.username}</span>
          <button className="btn-secondary py-1" onClick={() => { logout(); navigate('/connexion'); }}>
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="flex gap-1 border-b bg-white px-4">
        {[
          ['orders', `Commandes en cours (${orders.length})`],
          ['new', 'Nouvelle commande'],
          ['menu', 'Disponibilité menu'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500'}`}>
            {label}
          </button>
        ))}
      </nav>

      <main className="p-4">
        {tab === 'orders' && (
          <OrderFeed orders={orders} onStatus={updateStatus} onPay={setPayFor} />
        )}
        {tab === 'new' && <CreateOrderForm onCreated={() => setTab('orders')} />}
        {tab === 'menu' && <MenuAvailability />}
      </main>

      {payFor && <PayModal order={payFor} onClose={() => setPayFor(null)} onPay={pay} />}
    </div>
  );
}

function OrderFeed({ orders, onStatus, onPay }) {
  if (orders.length === 0) {
    return <p className="py-16 text-center text-slate-400">Aucune commande en cours.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((o) => (
        <div key={o.id} className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold">#{o.id} · {o.table_label || SOURCE_LABELS[o.source]}</p>
              <p className="text-xs text-slate-500">{formatTime(o.created_at)} · il y a {elapsed(o.created_at)}</p>
            </div>
            <span className={`badge ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
          </div>
          <span className="mt-1 inline-block text-xs text-slate-400">{SOURCE_LABELS[o.source]}</span>
          <ul className="mt-3 space-y-1 text-sm">
            {o.items.map((it, i) => (
              <li key={i}>
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
          <div className="mt-3 flex items-center justify-between border-t pt-2">
            <span className="font-bold">{formatPrice(o.total_price)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {o.status === 'recue' && (
              <button className="btn-secondary py-1 text-sm" onClick={() => onStatus(o, 'en_preparation')}>En préparation</button>
            )}
            {o.status === 'en_preparation' && (
              <button className="btn py-1 text-sm bg-purple-600 text-white hover:bg-purple-700" onClick={() => onStatus(o, 'prete')}>Prêt</button>
            )}
            {o.status === 'prete' && (
              <button className="btn-success py-1 text-sm" onClick={() => onStatus(o, 'servie')}>Servie</button>
            )}
            <button className="btn-primary py-1 text-sm" onClick={() => onPay(o)}>Encaisser</button>
            <button className="btn-danger py-1 text-sm" onClick={() => { if (confirm('Annuler cette commande ?')) onStatus(o, 'annulee'); }}>Annuler</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PayModal({ order, onClose, onPay }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Encaisser la commande #{order.id}</h2>
        <p className="mt-1 text-2xl font-extrabold text-brand-600">{formatPrice(order.total_price)}</p>
        <p className="mt-4 text-sm text-slate-600">Choisissez le mode de paiement :</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button className="btn-success py-4" onClick={() => onPay(order, 'cash')}>💵 Espèces</button>
          <button className="btn-primary py-4" onClick={() => onPay(order, 'mobile_money')}>📱 Mobile Money</button>
        </div>
        <button className="btn-secondary mt-4 w-full" onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

// Création manuelle d'une commande (sur place ou livraison).
function CreateOrderForm({ onCreated }) {
  const [menu, setMenu] = useState([]);
  const [source, setSource] = useState('walk_in');
  const [tableLabel, setTableLabel] = useState('');
  const [note, setNote] = useState('');
  const [cart, setCart] = useState([]); // [{ key, item, selection, qty }]
  const [picker, setPicker] = useState(null);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/menu/manage').then(setMenu).catch(() => {}); }, []);

  const total = cart.reduce((s, l) => s + unitPrice(l.item, l.selection) * l.qty, 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter((m) => m.is_available && (!q || m.name.toLowerCase().includes(q)));
  }, [menu, search]);

  function addLine(item, selection, qty) {
    const key = lineKey(item.id, selection);
    setCart((c) => {
      const existing = c.find((l) => l.key === key);
      if (existing) return c.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      return [...c, { key, item, selection, qty }];
    });
  }

  function onAdd(item) {
    if (hasOptions(item)) setPicker(item);
    else addLine(item, emptySelection(item), 1);
  }

  function changeQty(key, delta) {
    setCart((c) => c.map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0));
  }

  async function submit() {
    if (cart.length === 0) return;
    setSubmitting(true); setError('');
    try {
      await api.post('/orders', {
        source,
        table_label: source === 'delivery' ? (tableLabel || 'Livraison') : tableLabel,
        note,
        items: cart.map((l) => ({ id: l.item.id, qty: l.qty, options: l.selection })),
      });
      setCart([]); setTableLabel(''); setNote('');
      onCreated();
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-4">
        <h2 className="mb-3 font-bold">Articles</h2>
        <input className="input mb-3" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {filtered.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border p-2">
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-slate-500">{formatPrice(m.price)} · stock {m.stock_quantity}</p>
              </div>
              <button className="btn-primary h-8 px-3 text-sm" onClick={() => onAdd(m)}>
                {hasOptions(m) ? 'Choisir' : 'Ajouter'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card h-fit p-4">
        <h2 className="mb-3 font-bold">Détails de la commande</h2>
        <label className="label">Type</label>
        <div className="mb-3 flex gap-2">
          <button className={`btn flex-1 ${source === 'walk_in' ? 'bg-brand-600 text-white' : 'bg-slate-200'}`} onClick={() => setSource('walk_in')}>Sur place</button>
          <button className={`btn flex-1 ${source === 'delivery' ? 'bg-brand-600 text-white' : 'bg-slate-200'}`} onClick={() => setSource('delivery')}>Livraison</button>
        </div>
        <label className="label">{source === 'delivery' ? 'Client / livreur' : 'Table / nom (facultatif)'}</label>
        <input className="input mb-3" value={tableLabel} onChange={(e) => setTableLabel(e.target.value)}
          placeholder={source === 'delivery' ? 'Nom du client ou livreur' : 'Ex : Comptoir, Table 3…'} />
        <label className="label">Note (facultatif)</label>
        <input className="input mb-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sans piment, à emporter…" />

        <div className="mt-2 border-t pt-3">
          {cart.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun article sélectionné.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {cart.map((l) => (
                <li key={l.key} className="rounded-lg border p-2">
                  <div className="flex justify-between font-medium">
                    <span>{l.item.name}</span>
                    <span>{formatPrice(unitPrice(l.item, l.selection) * l.qty)}</span>
                  </div>
                  {optionLines(l.item, l.selection).map((o, i) => (
                    <p key={i} className="text-xs text-slate-500">• {o.label}{o.price > 0 && ` (+${formatPrice(o.price)})`}</p>
                  ))}
                  <div className="mt-1 flex items-center gap-2">
                    <button className="btn-secondary h-7 w-7 !px-0" onClick={() => changeQty(l.key, -1)}>−</button>
                    <span className="w-5 text-center">{l.qty}</span>
                    <button className="btn-secondary h-7 w-7 !px-0" onClick={() => changeQty(l.key, +1)}>+</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex justify-between border-t pt-2 font-bold">
            <span>Total</span><span>{formatPrice(total)}</span>
          </div>
        </div>
        {error && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary mt-3 w-full" disabled={submitting || cart.length === 0} onClick={submit}>
          {submitting ? 'Création…' : 'Valider la commande'}
        </button>
      </div>

      {picker && (
        <OptionPicker
          item={picker}
          onClose={() => setPicker(null)}
          onConfirm={(selection, qty) => { addLine(picker, selection, qty); setPicker(null); }}
        />
      )}
    </div>
  );
}

// Bascule rapide de la disponibilité des plats.
function MenuAvailability() {
  const [menu, setMenu] = useState([]);
  async function load() { try { setMenu(await api.get('/menu/manage')); } catch { /* ignore */ } }
  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('menu:updated', load);
    return () => socket.off('menu:updated', load);
  }, []);

  async function toggle(item) {
    try {
      await api.patch(`/menu/${item.id}/availability`, { is_available: !item.is_available });
    } catch (e) { alert(e.message); }
  }

  const byCat = {};
  for (const m of menu) (byCat[m.category] ||= []).push(m);

  return (
    <div className="space-y-6">
      {Object.entries(byCat).map(([cat, items]) => (
        <div key={cat}>
          <h2 className="mb-2 font-bold text-slate-700">{cat}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <div key={m.id} className="card flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-slate-500">
                    Stock {m.stock_quantity}
                    {m.low_stock && <span className="ml-1 text-amber-600">· stock bas</span>}
                  </p>
                </div>
                <button onClick={() => toggle(m)}
                  className={`badge ${m.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                  {m.is_available ? 'Disponible' : 'Indisponible'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
