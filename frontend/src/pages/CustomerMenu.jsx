import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';
import { newClientUid, queueOrder } from '../lib/offline.js';
import { getSocket } from '../lib/socket.js';
import { hasOptions, unitPrice, optionLines, lineKey, emptySelection } from '../lib/cart.js';
import OnlineBadge from '../components/OnlineBadge.jsx';
import OptionPicker from '../components/OptionPicker.jsx';

export default function CustomerMenu() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tableToken = params.get('table') || '';

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // [{ key, item, qty, selection }]
  const [picker, setPicker] = useState(null); // article en cours de configuration
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [offlineConfirm, setOfflineConfirm] = useState(false);
  const [error, setError] = useState('');

  async function loadMenu() {
    try { setItems(await api.get('/menu')); }
    catch { setError('Impossible de charger le menu. Vérifiez votre connexion.'); }
  }

  useEffect(() => {
    loadMenu();
    const socket = getSocket();
    const onUpdate = () => loadMenu();
    socket.on('menu:updated', onUpdate);
    socket.on('stock:low', onUpdate);
    return () => { socket.off('menu:updated', onUpdate); socket.off('stock:low', onUpdate); };
  }, []);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = items.filter((it) =>
      it.is_available &&
      (!q || it.name.toLowerCase().includes(q) || (it.description || '').toLowerCase().includes(q))
    );
    const groups = {};
    for (const it of visible) (groups[it.category] ||= []).push(it);
    return groups;
  }, [items, search]);

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const total = cart.reduce((s, l) => s + unitPrice(l.item, l.selection) * l.qty, 0);

  // Ajoute une ligne (fusionne si même configuration).
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
    setCart((c) => c
      .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
      .filter((l) => l.qty > 0));
  }

  // Quantité totale d'un article (toutes configurations confondues) — pour le badge des cartes.
  function itemQty(itemId) {
    return cart.filter((l) => l.item.id === itemId).reduce((s, l) => s + l.qty, 0);
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');
    const order = {
      client_uid: newClientUid(),
      source: 'qr_table',
      table_token: tableToken || undefined,
      items: cart.map((l) => ({ id: l.item.id, qty: l.qty, options: l.selection })),
    };
    try {
      if (navigator.onLine) {
        const created = await api.post('/orders', order);
        setCart([]);
        navigate(`/suivi/${created.id}`);
      } else {
        await queueOrder(order);
        window.dispatchEvent(new Event('queue:changed'));
        setCart([]);
        setOfflineConfirm(true);
      }
    } catch (err) {
      if (!err.status) {
        await queueOrder(order);
        window.dispatchEvent(new Event('queue:changed'));
        setCart([]);
        setOfflineConfirm(true);
      } else {
        setError(err.message || "La commande n'a pas pu être envoyée.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (offlineConfirm) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="card p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 text-3xl">⏳</div>
          <h1 className="text-xl font-bold">Commande enregistrée hors ligne</h1>
          <p className="mt-2 text-slate-600">
            Vous êtes actuellement hors ligne. Votre commande sera envoyée automatiquement
            dès le retour de la connexion.
          </p>
          <button className="btn-primary mt-6 w-full" onClick={() => setOfflineConfirm(false)}>
            Nouvelle commande
          </button>
        </div>
      </div>
    );
  }

  const categories = Object.keys(grouped);

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <header className="sticky top-0 z-10 bg-brand-600 px-4 py-3 text-white shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Papatchino" className="h-8 w-auto rounded bg-white px-1.5 py-1" />
          </div>
          <OnlineBadge />
        </div>
        <div className="mt-3">
          <input
            className="w-full rounded-lg border-0 px-3 py-2 text-slate-800 outline-none"
            placeholder="Rechercher un plat…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {error && <p className="m-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!tableToken && (
        <p className="m-4 rounded-lg bg-gold-50 px-3 py-2 text-sm text-gold-800">
          Aucune table détectée. Scannez le QR code de votre table pour une commande à table.
        </p>
      )}

      <div className="space-y-8 p-4">
        {categories.length === 0 && (
          <p className="py-10 text-center text-slate-400">Aucun plat ne correspond à votre recherche.</p>
        )}
        {categories.map((cat) => (
          <section key={cat}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-800">{cat}</h2>
              <span className="h-1 flex-1 rounded-full bg-gradient-to-r from-brand-500/40 to-transparent" />
              <span className="badge bg-slate-100 text-slate-500">{grouped[cat].length}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {grouped[cat].map((it) => (
                <MenuCard key={it.id} item={it} qty={itemQty(it.id)} onAdd={() => onAdd(it)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Barre panier */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white p-3 shadow-2xl">
          <div className="mx-auto max-w-2xl">
            <button className="mb-2 w-full text-left text-sm text-brand-600 underline"
              onClick={() => setShowCart((v) => !v)}>
              {showCart ? 'Masquer le détail' : 'Voir le détail du panier'}
            </button>
            {showCart && (
              <div className="mb-3 max-h-56 space-y-2 overflow-y-auto">
                {cart.map((l) => (
                  <div key={l.key} className="rounded-lg border p-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{l.item.name}</span>
                      <span>{formatPrice(unitPrice(l.item, l.selection) * l.qty)}</span>
                    </div>
                    {optionLines(l.item, l.selection).map((o, i) => (
                      <p key={i} className="text-xs text-slate-500">• {o.label}{o.price > 0 && ` (+${formatPrice(o.price)})`}</p>
                    ))}
                    <div className="mt-1 flex items-center gap-2">
                      <button className="btn-secondary h-7 w-7 !px-0" onClick={() => changeQty(l.key, -1)}>−</button>
                      <span className="w-5 text-center text-sm">{l.qty}</span>
                      <button className="btn-secondary h-7 w-7 !px-0" onClick={() => changeQty(l.key, +1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-slate-500">{cartCount} article(s)</p>
                <p className="text-lg font-bold">{formatPrice(total)}</p>
              </div>
              <button className="btn-primary flex-1" onClick={submitOrder} disabled={submitting}>
                {submitting ? 'Envoi…' : 'Commander'}
              </button>
            </div>
          </div>
        </div>
      )}

      {picker && (
        <OptionPicker
          item={picker}
          onClose={() => setPicker(null)}
          onConfirm={(selection, qty) => { addLine(picker, selection, qty); setPicker(null); }}
        />
      )}

      <div className="px-4 pb-6 text-center">
        <Link to="/connexion" className="text-xs text-slate-400 hover:text-slate-600">Accès personnel</Link>
      </div>
    </div>
  );
}

function MenuCard({ item, qty, onAdd }) {
  const [imgOk, setImgOk] = useState(true);
  const configurable = Array.isArray(item.options) && item.options.length > 0;

  return (
    <div className="group card flex flex-col overflow-hidden transition hover:shadow-md">
      {/* Visuel */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {item.photo_url && imgOk ? (
          <img
            src={item.photo_url}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-gold-50 text-brand-300">
            <img src="/papatch2.svg" alt="" className="h-12 w-12 opacity-40" />
            <span className="mt-1 text-xs font-medium text-slate-400">Photo à venir</span>
          </div>
        )}
        {/* Prix en pastille sur la photo */}
        <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-3 py-1 text-sm font-extrabold text-brand-600 shadow-sm">
          {formatPrice(item.price)}
        </span>
        {qty > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white shadow">
            {qty} au panier
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-bold text-slate-800">{item.name}</h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p>
        )}
        <button className="btn-primary mt-3 w-full" onClick={onAdd}>
          {configurable ? 'Choisir' : 'Ajouter'}
        </button>
      </div>
    </div>
  );
}
