import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';
import { newClientUid, queueOrder } from '../lib/offline.js';
import { getSocket } from '../lib/socket.js';
import OnlineBadge from '../components/OnlineBadge.jsx';

export default function CustomerMenu() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tableToken = params.get('table') || '';

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({}); // { [itemId]: qty }
  const [submitting, setSubmitting] = useState(false);
  const [offlineConfirm, setOfflineConfirm] = useState(false);
  const [error, setError] = useState('');

  async function loadMenu() {
    try {
      const data = await api.get('/menu');
      setItems(data);
    } catch {
      setError("Impossible de charger le menu. Vérifiez votre connexion.");
    }
  }

  useEffect(() => {
    loadMenu();
    const socket = getSocket();
    const onUpdate = () => loadMenu();
    socket.on('menu:updated', onUpdate);
    socket.on('stock:low', onUpdate);
    return () => { socket.off('menu:updated', onUpdate); socket.off('stock:low', onUpdate); };
  }, []);

  // Articles disponibles uniquement, filtrés par la recherche, groupés par catégorie.
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = items.filter((it) =>
      it.is_available &&
      (!q || it.name.toLowerCase().includes(q) || (it.description || '').toLowerCase().includes(q))
    );
    const groups = {};
    for (const it of visible) {
      (groups[it.category] ||= []).push(it);
    }
    return groups;
  }, [items, search]);

  const cartLines = useMemo(() =>
    Object.entries(cart)
      .map(([id, qty]) => ({ item: items.find((i) => i.id === +id), qty }))
      .filter((l) => l.item && l.qty > 0),
    [cart, items]);

  const total = cartLines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);

  function setQty(id, qty) {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  async function submitOrder() {
    if (cartLines.length === 0) return;
    setSubmitting(true);
    setError('');
    const order = {
      client_uid: newClientUid(),
      source: 'qr_table',
      table_token: tableToken || undefined,
      items: cartLines.map((l) => ({ id: l.item.id, qty: l.qty })),
    };
    try {
      if (navigator.onLine) {
        const created = await api.post('/orders', order);
        setCart({});
        navigate(`/suivi/${created.id}`);
      } else {
        await queueOrder(order);
        window.dispatchEvent(new Event('queue:changed'));
        setCart({});
        setOfflineConfirm(true);
      }
    } catch (err) {
      // En cas d'échec réseau imprévu, on met la commande en file d'attente.
      if (!err.status) {
        await queueOrder(order);
        window.dispatchEvent(new Event('queue:changed'));
        setCart({});
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">⏳</div>
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
      {/* En-tête */}
      <header className="sticky top-0 z-10 bg-brand-600 px-4 py-3 text-white shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Notre Menu</h1>
            <p className="text-xs text-brand-100">
              {tableToken ? 'Commande à table' : 'Commande'}
            </p>
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
        <p className="m-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Aucune table détectée. Scannez le QR code de votre table pour une commande à table.
        </p>
      )}

      {/* Catégories */}
      <div className="space-y-6 p-4">
        {categories.length === 0 && (
          <p className="py-10 text-center text-slate-400">Aucun plat ne correspond à votre recherche.</p>
        )}
        {categories.map((cat) => (
          <section key={cat}>
            <h2 className="mb-2 text-lg font-bold text-slate-800">{cat}</h2>
            <div className="grid gap-3">
              {grouped[cat].map((it) => (
                <MenuCard key={it.id} item={it} qty={cart[it.id] || 0} setQty={setQty} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Barre panier */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white p-3 shadow-2xl">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-slate-500">{cartCount} article(s)</p>
              <p className="text-lg font-bold">{formatPrice(total)}</p>
            </div>
            <button className="btn-primary flex-1" onClick={submitOrder} disabled={submitting}>
              {submitting ? 'Envoi…' : 'Commander'}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pb-6 text-center">
        <Link to="/connexion" className="text-xs text-slate-400 hover:text-slate-600">Accès personnel</Link>
      </div>
    </div>
  );
}

function MenuCard({ item, qty, setQty }) {
  return (
    <div className="card flex overflow-hidden">
      {item.photo_url && (
        <img src={item.photo_url} alt={item.name} className="h-24 w-24 flex-shrink-0 object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      )}
      <div className="flex flex-1 flex-col p-3">
        <div className="flex justify-between gap-2">
          <h3 className="font-semibold text-slate-800">{item.name}</h3>
          <span className="whitespace-nowrap font-bold text-brand-600">{formatPrice(item.price)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p>
        <div className="mt-auto flex justify-end pt-2">
          {qty > 0 ? (
            <div className="flex items-center gap-3">
              <button className="btn-secondary h-8 w-8 !px-0" onClick={() => setQty(item.id, qty - 1)}>−</button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button className="btn-primary h-8 w-8 !px-0" onClick={() => setQty(item.id, qty + 1)}>+</button>
            </div>
          ) : (
            <button className="btn-primary h-8 px-3 text-sm" onClick={() => setQty(item.id, 1)}>Ajouter</button>
          )}
        </div>
      </div>
    </div>
  );
}
