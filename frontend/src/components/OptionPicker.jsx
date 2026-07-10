import { useState } from 'react';
import { formatPrice } from '../lib/format.js';
import { emptySelection, unitPrice, validateSelection } from '../lib/cart.js';

// Fiche de choix des options d'un article (formule, accompagnement, suppléments…).
// S'affiche en "bottom sheet" sur mobile, centrée sur grand écran.
// Appelle onConfirm(selection, quantité) à la validation.
export default function OptionPicker({ item, onConfirm, onClose, initialQty = 1 }) {
  const [selection, setSelection] = useState(() => emptySelection(item));
  const [qty, setQty] = useState(initialQty);
  const [error, setError] = useState('');

  function pickSingle(group, choiceKey) {
    setSelection((s) => ({ ...s, [group.key]: choiceKey }));
    setError('');
  }
  function toggleMulti(group, choiceKey) {
    setSelection((s) => {
      const cur = Array.isArray(s[group.key]) ? s[group.key] : [];
      const has = cur.includes(choiceKey);
      const max = group.max ?? Infinity;
      let next;
      if (has) next = cur.filter((k) => k !== choiceKey);
      else if (cur.length >= max) next = cur; // limite atteinte
      else next = [...cur, choiceKey];
      return { ...s, [group.key]: next };
    });
    setError('');
  }

  function confirm() {
    const err = validateSelection(item, selection);
    if (err) { setError(err); return; }
    onConfirm(selection, qty);
  }

  const total = unitPrice(item, selection) * qty;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-md animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}>

        {/* Poignée (mobile) */}
        <div className="pt-2.5 sm:hidden">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200" />
        </div>

        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
          <div>
            <h2 className="font-display text-xl text-slate-800">{item.name}</h2>
            {item.description && <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>}
          </div>
          <span className="-rotate-3 whitespace-nowrap rounded-xl bg-gold-400 px-3 py-1 font-display text-brand-800 shadow-sm">
            {formatPrice(item.price)}
          </span>
        </div>

        {/* Groupes d'options (zone défilante) */}
        <div className="flex-1 space-y-5 overflow-y-auto border-t border-slate-100 px-5 py-4">
          {(item.options || []).map((group) => {
            const selected = selection[group.key];
            return (
              <div key={group.key}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="font-bold text-slate-700">{group.label}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    group.required ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {group.type === 'multi'
                      ? (group.required ? `${group.min ?? 1}–${group.max ?? '∞'} au choix` : 'facultatif')
                      : (group.required ? 'obligatoire' : 'facultatif')}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.choices.map((c) => {
                    const isMulti = group.type === 'multi';
                    const checked = isMulti
                      ? Array.isArray(selected) && selected.includes(c.key)
                      : selected === c.key;
                    return (
                      <label key={c.key}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-3.5 py-2.5 transition active:scale-[0.99] ${
                          checked
                            ? 'border-brand-500 bg-brand-50 shadow-sm'
                            : 'border-slate-150 border-slate-200 bg-white hover:border-brand-200'
                        }`}>
                        <span className="flex items-center gap-2.5">
                          <input
                            type={isMulti ? 'checkbox' : 'radio'}
                            name={group.key}
                            checked={checked}
                            onChange={() => isMulti ? toggleMulti(group, c.key) : pickSingle(group, c.key)}
                            className="h-4 w-4 accent-brand-600"
                          />
                          <span className={`font-medium ${checked ? 'text-brand-800' : 'text-slate-700'}`}>{c.label}</span>
                        </span>
                        {c.price > 0 && (
                          <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-gold-800">
                            +{formatPrice(c.price)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pied fixe : quantité + validation */}
        <div className="border-t border-slate-100 bg-white px-5 py-4">
          {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 transition active:scale-90"
                onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span className="w-7 text-center font-display text-lg text-slate-800">{qty}</span>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 transition active:scale-90"
                onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
            <button
              className="flex-1 rounded-full bg-brand-600 py-3 font-bold text-white shadow transition hover:bg-brand-700 active:scale-95"
              onClick={confirm}>
              Ajouter · {formatPrice(total)}
            </button>
          </div>
          <button className="mt-2 w-full py-1 text-center text-sm font-medium text-slate-400 hover:text-slate-600" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
