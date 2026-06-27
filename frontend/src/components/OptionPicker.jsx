import { useState } from 'react';
import { formatPrice } from '../lib/format.js';
import { emptySelection, unitPrice, validateSelection } from '../lib/cart.js';

// Modale de choix des options d'un article (formule, accompagnement, suppléments…).
// Appelle onConfirm(selection, quantité) à la validation.
export default function OptionPicker({ item, onConfirm, onClose, initialQty = 1 }) {
  const [selection, setSelection] = useState(() => emptySelection(item));
  const [qty, setQty] = useState(initialQty);
  const [error, setError] = useState('');

  function pickSingle(group, choiceKey) {
    setSelection((s) => ({ ...s, [group.key]: choiceKey }));
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
  }

  function confirm() {
    const err = validateSelection(item, selection);
    if (err) { setError(err); return; }
    onConfirm(selection, qty);
  }

  const total = unitPrice(item, selection) * qty;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-b-none p-5 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{item.name}</h2>
            <p className="text-sm text-slate-500">{item.description}</p>
          </div>
          <span className="whitespace-nowrap font-bold text-brand-600">{formatPrice(item.price)}</span>
        </div>

        <div className="space-y-4">
          {(item.options || []).map((group) => {
            const selected = selection[group.key];
            return (
              <div key={group.key}>
                <div className="mb-1 flex items-baseline justify-between">
                  <h3 className="font-semibold text-slate-700">{group.label}</h3>
                  <span className="text-xs text-slate-400">
                    {group.type === 'multi'
                      ? (group.required ? `${group.min ?? 1}–${group.max ?? '∞'} au choix` : 'facultatif')
                      : (group.required ? 'obligatoire' : 'facultatif')}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.choices.map((c) => {
                    const isMulti = group.type === 'multi';
                    const checked = isMulti
                      ? Array.isArray(selected) && selected.includes(c.key)
                      : selected === c.key;
                    return (
                      <label key={c.key}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 ${checked ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                        <span className="flex items-center gap-2">
                          <input
                            type={isMulti ? 'checkbox' : 'radio'}
                            name={group.key}
                            checked={checked}
                            onChange={() => isMulti ? toggleMulti(group, c.key) : pickSingle(group, c.key)}
                            className="accent-brand-600"
                          />
                          <span>{c.label}</span>
                        </span>
                        {c.price > 0 && <span className="text-sm font-medium text-slate-500">+{formatPrice(c.price)}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button className="btn-secondary h-9 w-9 !px-0" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="w-6 text-center font-semibold">{qty}</span>
            <button className="btn-secondary h-9 w-9 !px-0" onClick={() => setQty((q) => q + 1)}>+</button>
          </div>
          <button className="btn-primary flex-1" onClick={confirm}>
            Ajouter · {formatPrice(total)}
          </button>
        </div>
        <button className="btn-secondary mt-2 w-full" onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}
