import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [showTakeawayForm, setShowTakeawayForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [activeCat, setActiveCat] = useState('');
  const sectionRefs = useRef({});

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

  const categories = Object.keys(grouped);

  // Surligne la catégorie visible pendant le défilement.
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveCat(visible[0].target.dataset.cat);
    }, { rootMargin: '-90px 0px -55% 0px' });
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [categories.join('|')]);

  function goToCat(cat) {
    setActiveCat(cat);
    sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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

  function handleCommanderClick() {
    if (cart.length === 0) return;
    if (!tableToken) {
      setShowTakeawayForm(true);
    } else {
      submitOrder();
    }
  }

  async function submitOrder(takeawayInfo = null) {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');
    const isTakeaway = !tableToken;
    const order = {
      client_uid: newClientUid(),
      source: isTakeaway ? 'walk_in' : 'qr_table',
      table_token: tableToken || undefined,
      items: cart.map((l) => ({ id: l.item.id, qty: l.qty, options: l.selection })),
      ...(isTakeaway && takeawayInfo),
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
      <div className="min-h-full bg-[#FBF3E4] p-6">
        <div className="mx-auto max-w-md pt-10 text-center">
          <div className="animate-fade-up rounded-3xl bg-white p-8 shadow-[0_10px_40px_rgba(120,60,20,0.12)]">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gold-100 text-3xl">⏳</div>
            <h1 className="font-display text-2xl text-slate-800">Commande enregistrée hors ligne</h1>
            <p className="mt-2 text-slate-600">
              Vous êtes actuellement hors ligne. Votre commande sera envoyée automatiquement
              dès le retour de la connexion.
            </p>
            <button className="mt-6 w-full rounded-full bg-brand-600 py-3 font-bold text-white transition hover:bg-brand-700 active:scale-95"
              onClick={() => setOfflineConfirm(false)}>
              Nouvelle commande
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#FBF3E4] pb-36">
      {/* En-tête de marque */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 px-4 pb-14 pt-4 text-white">
        {/* Motif pointillé discret */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1.2px, transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="relative mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <img src="/logo.svg" alt="Papatchino" className="h-9 w-auto rounded-lg bg-white px-2 py-1 shadow" />
            <OnlineBadge />
          </div>
          <h1 className="mt-6 font-display text-3xl leading-tight sm:text-4xl">
            Qu'est-ce qui vous <span className="text-gold-400">fait envie</span> ?
          </h1>
          <p className="mt-1 text-sm text-white/70">
            {tableToken ? 'Commande à table — préparée et servie directement' : 'Notre carte'}
          </p>
          <div className="relative mt-4">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            </svg>
            <input
              className="w-full rounded-full border-0 bg-white py-3 pl-11 pr-4 text-slate-800 shadow-lg outline-none ring-gold-400 placeholder:text-slate-400 focus:ring-2"
              placeholder="Rechercher un plat…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {/* Vague crème en bas du header (écho de la vague du logo) */}
        <svg aria-hidden className="absolute inset-x-0 bottom-0 h-7 w-full text-[#FBF3E4]" viewBox="0 0 1440 48" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,48 L0,22 C240,46 480,6 720,18 C960,30 1200,10 1440,26 L1440,48 Z" />
        </svg>
      </header>

      {/* Barre de catégories collante */}
      {categories.length > 0 && (
        <nav className="no-scrollbar sticky top-0 z-30 -mt-2 overflow-x-auto bg-[#FBF3E4]/90 px-3 py-2.5 backdrop-blur">
          <div className="mx-auto flex max-w-2xl gap-2">
            {categories.map((cat) => (
              <button key={cat} onClick={() => goToCat(cat)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm transition active:scale-95 ${
                  activeCat === cat
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-brand-50'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className="mx-auto max-w-2xl">
        {error && <p className="m-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {!tableToken && (
          <p className="m-4 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-gold-800">
            🛍️ Commande à emporter — passez votre commande et venez la récupérer au comptoir.
          </p>
        )}

        <div className="space-y-9 p-4 pt-5">
          {categories.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-4xl">🍟</p>
              <p className="mt-3 font-display text-xl text-slate-500">Aucun plat trouvé</p>
              <p className="text-sm text-slate-400">Essayez un autre mot-clé.</p>
            </div>
          )}
          {categories.map((cat) => (
            <section key={cat} ref={(el) => { sectionRefs.current[cat] = el; }} data-cat={cat} className="scroll-mt-16">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="font-display text-2xl text-slate-800">{cat}</h2>
                  {/* petite vague dorée sous le titre */}
                  <svg width="76" height="8" viewBox="0 0 76 8" className="mt-1 text-gold-500" aria-hidden>
                    <path d="M2 5 C14 1, 26 7, 38 4 C50 1, 62 7, 74 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-400 shadow-sm">
                  {grouped[cat].length} plat{grouped[cat].length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {grouped[cat].map((it, i) => (
                  <MenuCard key={it.id} item={it} qty={itemQty(it.id)} onAdd={() => onAdd(it)} index={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Panier flottant */}
      {cartCount > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
          <div className="pointer-events-auto mx-auto max-w-2xl">
            {showCart && (
              <div className="mb-2 max-h-64 animate-fade-up space-y-2 overflow-y-auto rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-black/10">
                {cart.map((l) => (
                  <div key={l.key} className="rounded-xl border border-slate-100 bg-[#FDFAF3] p-2.5">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{l.item.name}</span>
                      <span className="text-brand-600">{formatPrice(unitPrice(l.item, l.selection) * l.qty)}</span>
                    </div>
                    {optionLines(l.item, l.selection).map((o, i) => (
                      <p key={i} className="text-xs text-slate-500">• {o.label}{o.price > 0 && ` (+${formatPrice(o.price)})`}</p>
                    ))}
                    <div className="mt-1.5 flex items-center gap-2">
                      <button className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 font-bold text-slate-600 active:scale-90" onClick={() => changeQty(l.key, -1)}>−</button>
                      <span className="w-5 text-center text-sm font-bold">{l.qty}</span>
                      <button className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 font-bold text-white active:scale-90" onClick={() => changeQty(l.key, +1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="animate-slide-up rounded-2xl bg-brand-700 p-3 shadow-2xl ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2.5 text-white" onClick={() => setShowCart((v) => !v)}>
                  <span className="grid h-10 w-10 animate-pop place-items-center rounded-full bg-gold-400 font-display text-lg text-brand-800">
                    {cartCount}
                  </span>
                  <span className="text-left leading-tight">
                    <span className="block text-[11px] uppercase tracking-wider text-white/60">
                      {showCart ? 'Masquer le panier' : 'Voir le panier'}
                    </span>
                    <span className="font-display text-lg">{formatPrice(total)}</span>
                  </span>
                </button>
                <button
                  className="ml-auto rounded-full bg-white px-6 py-2.5 font-bold text-brand-700 shadow transition hover:bg-gold-50 active:scale-95 disabled:opacity-60"
                  onClick={handleCommanderClick} disabled={submitting}>
                  {submitting ? 'Envoi…' : 'Commander'}
                </button>
              </div>
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

      {showTakeawayForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 pb-3 sm:items-center">
          <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="font-display text-2xl text-slate-800">Votre commande à emporter</h2>
            <p className="mt-1 text-sm text-slate-500">Nous vous appellerons pour confirmer votre commande.</p>
            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Votre nom *</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  placeholder="Ex : Moussa Diallo"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Numéro de téléphone *</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  placeholder="Ex : +221 77 000 00 00"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Heure de retrait souhaitée *</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                className="flex-1 rounded-full border border-slate-200 py-3 font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
                onClick={() => { setShowTakeawayForm(false); setError(''); }}>
                Annuler
              </button>
              <button
                className="flex-1 rounded-full bg-brand-600 py-3 font-bold text-white shadow transition hover:bg-brand-700 active:scale-95 disabled:opacity-60"
                disabled={submitting}
                onClick={() => {
                  if (!customerName.trim()) { setError('Veuillez entrer votre nom.'); return; }
                  if (!customerPhone.trim()) { setError('Veuillez entrer votre numéro de téléphone.'); return; }
                  if (!pickupTime) { setError("Veuillez indiquer l'heure de retrait."); return; }
                  setShowTakeawayForm(false);
                  submitOrder({ customer_name: customerName.trim(), customer_phone: customerPhone.trim(), pickup_time: pickupTime });
                }}>
                {submitting ? 'Envoi…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pb-6 pt-2 text-center">
        <Link to="/connexion" className="text-xs text-slate-400 hover:text-slate-600">Accès personnel</Link>
      </div>
    </div>
  );
}

function MenuCard({ item, qty, onAdd, index }) {
  const [imgOk, setImgOk] = useState(true);
  const configurable = Array.isArray(item.options) && item.options.length > 0;

  return (
    <div
      className="group animate-fade-up overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(125,60,20,0.08)] ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(125,60,20,0.16)]"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      {/* Visuel */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-50">
        {item.photo_url && imgOk ? (
          <img
            src={item.photo_url}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-[#FDF3E0] to-gold-100">
            <img src="/papatch2.svg" alt="" className="h-12 w-12 opacity-30" />
            <span className="mt-1 text-xs font-semibold text-slate-400/80">Photo à venir</span>
          </div>
        )}
        {/* Pastille prix façon sticker */}
        <span className="absolute bottom-2.5 right-2.5 -rotate-3 rounded-xl bg-gold-400 px-3 py-1 font-display text-base text-brand-800 shadow-md">
          {formatPrice(item.price)}
        </span>
        {qty > 0 && (
          <span className="absolute left-2.5 top-2.5 animate-pop rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white shadow">
            {qty} au panier
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="p-3.5">
        <h3 className="font-bold leading-snug text-slate-800">{item.name}</h3>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{item.description}</p>
        )}
        <button
          className="mt-3 w-full rounded-full bg-brand-600 py-2.5 font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
          onClick={onAdd}>
          {configurable ? 'Choisir ›' : '+ Ajouter'}
        </button>
      </div>
    </div>
  );
}
