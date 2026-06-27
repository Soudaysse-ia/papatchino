import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatPrice } from '../../lib/format.js';
import { normalizeOptions } from '../../lib/cart.js';
import { uploadImage } from '../../lib/image.js';

const EMPTY = {
  name: '', description: '', price: '', category: 'Smash Burgers', photo_url: '',
  is_available: true, stock_quantity: 0, low_stock_threshold: 5, options: [],
};
const CATEGORIES = [
  'Smash Burgers', 'Sandwichs', 'Frites Signature', 'Grillades',
  'Les Planchas', 'Crêpes / Gaufres', 'Brioche Perdue', 'Boissons',
];

export default function MenuAdmin() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // objet en cours d'édition ou null
  const [error, setError] = useState('');

  async function load() { try { setItems(await api.get('/menu/manage')); } catch (e) { setError(e.message); } }
  useEffect(() => { load(); }, []);

  async function save(item) {
    try {
      const payload = {
        ...item,
        price: Number(item.price) || 0,
        stock_quantity: Number(item.stock_quantity) || 0,
        low_stock_threshold: Number(item.low_stock_threshold) || 0,
        options: normalizeOptions(item.options),
      };
      if (item.id) await api.put(`/menu/${item.id}`, payload);
      else await api.post('/menu', payload);
      setEditing(null);
      load();
    } catch (e) { alert(e.message); }
  }

  async function remove(item) {
    if (!confirm(`Supprimer "${item.name}" ?`)) return;
    try { await api.del(`/menu/${item.id}`); load(); } catch (e) { alert(e.message); }
  }

  async function loadDefaultMenu() {
    const replace = items.length > 0;
    const msg = replace
      ? 'Remplacer TOUT le menu actuel par le menu Papatchino par défaut ?\n\nLes plats actuels (et leurs photos) seront supprimés. Les commandes et comptes ne sont pas touchés.'
      : 'Charger le menu Papatchino par défaut ?';
    if (!confirm(msg)) return;
    try {
      const r = await api.post('/menu/load-default', { replace });
      alert(`Menu chargé : ${r.count} plats.`);
      load();
    } catch (e) { alert(e.message); }
  }

  const byCat = {};
  for (const m of items) (byCat[m.category] ||= []).push(m);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Gestion du menu & stock</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={loadDefaultMenu}>Menu Papatchino par défaut</button>
          <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}>+ Ajouter un plat</button>
        </div>
      </div>
      {error && <p className="text-red-600">{error}</p>}

      {Object.entries(byCat).map(([cat, list]) => (
        <div key={cat}>
          <h2 className="mb-2 font-bold text-slate-700">{cat}</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-3">Nom</th>
                  <th className="p-3">Prix</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Seuil</th>
                  <th className="p-3">État</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                          {m.photo_url
                            ? <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                            : <span className="text-slate-300">🍽️</span>}
                        </div>
                        <span>
                          {m.name}
                          {(m.options || []).length > 0 && (
                            <span className="ml-2 badge bg-gold-100 text-gold-800">
                              {m.options.length} option{m.options.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">{formatPrice(m.price)}</td>
                    <td className={`p-3 ${m.low_stock ? 'font-bold text-amber-600' : ''}`}>
                      {m.stock_quantity}{m.low_stock && ' ⚠️'}
                    </td>
                    <td className="p-3 text-slate-500">{m.low_stock_threshold}</td>
                    <td className="p-3">
                      <span className={`badge ${m.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                        {m.is_available ? 'Disponible' : 'Indisponible'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-brand-600 hover:underline" onClick={() => setEditing(m)}>Modifier</button>
                      <button className="ml-3 text-red-600 hover:underline" onClick={() => remove(m)}>Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {editing && <ItemModal item={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function ItemModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{item.id ? 'Modifier le plat' : 'Nouveau plat'}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nom *</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div>
            <label className="label">Prix (KMF)</label>
            <input className="input" type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} />
          </div>
          <div>
            <label className="label">Catégorie</label>
            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quantité en stock</label>
            <input className="input" type="number" min="0" value={form.stock_quantity} onChange={(e) => set('stock_quantity', e.target.value)} />
          </div>
          <div>
            <label className="label">Seuil de stock bas</label>
            <input className="input" type="number" min="0" value={form.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Photo du plat</label>
            <PhotoUploader value={form.photo_url} onChange={(url) => set('photo_url', url)} />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_available} onChange={(e) => set('is_available', e.target.checked)} />
              <span className="text-sm">Disponible à la commande</span>
            </label>
          </div>
        </div>

        <OptionsEditor options={form.options || []} onChange={(opts) => set('options', opts)} />

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.name.trim()}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// Téléversement / aperçu de la photo d'un plat.
function PhotoUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-sélectionner le même fichier
    if (!file) return;
    setError(''); setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      setError(err.message || 'Téléversement impossible');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {value ? (
            <img src={value} alt="Aperçu" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl text-slate-300">🍽️</span>
          )}
        </div>
        <div className="flex-1">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <button type="button" className="btn-primary py-1.5 text-sm" disabled={uploading}
            onClick={() => inputRef.current?.click()}>
            {uploading ? 'Téléversement…' : value ? 'Changer la photo' : 'Choisir une photo'}
          </button>
          {value && (
            <button type="button" className="ml-2 text-sm text-red-600 hover:underline" onClick={() => onChange('')}>
              Retirer
            </button>
          )}
          <p className="mt-1 text-xs text-slate-400">JPG, PNG ou WebP — l'image est optimisée automatiquement.</p>
          <button type="button" className="mt-1 text-xs text-slate-500 underline" onClick={() => setShowUrl((v) => !v)}>
            {showUrl ? 'Masquer' : 'ou coller une URL'}
          </button>
          {showUrl && (
            <input className="input mt-1 text-sm" value={value || ''} placeholder="https://…"
              onChange={(e) => onChange(e.target.value)} />
          )}
        </div>
      </div>
      {error && <p className="mt-2 rounded bg-red-50 px-3 py-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}

// Éditeur des groupes d'options (formules, accompagnements, suppléments…).
function OptionsEditor({ options, onChange }) {
  const groups = Array.isArray(options) ? options : [];

  function updateGroup(gi, patch) {
    onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  }
  function addGroup() {
    onChange([...groups, { label: '', type: 'single', required: true, choices: [{ label: '', price: 0 }] }]);
  }
  function removeGroup(gi) {
    onChange(groups.filter((_, i) => i !== gi));
  }
  function updateChoice(gi, ci, patch) {
    const g = groups[gi];
    const choices = (g.choices || []).map((c, i) => (i === ci ? { ...c, ...patch } : c));
    updateGroup(gi, { choices });
  }
  function addChoice(gi) {
    const g = groups[gi];
    updateGroup(gi, { choices: [...(g.choices || []), { label: '', price: 0 }] });
  }
  function removeChoice(gi, ci) {
    const g = groups[gi];
    updateGroup(gi, { choices: (g.choices || []).filter((_, i) => i !== ci) });
  }

  return (
    <div className="mt-5 border-t pt-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-700">Options du plat</h3>
          <p className="text-xs text-slate-500">Formules, accompagnements, suppléments… proposés au client.</p>
        </div>
        <button type="button" className="btn-secondary py-1 text-sm" onClick={addGroup}>+ Groupe d'options</button>
      </div>

      {groups.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-400">Aucune option. Ce plat sera ajouté directement au panier.</p>
      )}

      <div className="space-y-3">
        {groups.map((g, gi) => (
          <div key={gi} className="rounded-lg border border-slate-200 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Titre du groupe</label>
                <input className="input" value={g.label || ''} placeholder="Ex : Formule, Accompagnement, Suppléments…"
                  onChange={(e) => updateGroup(gi, { label: e.target.value })} />
              </div>
              <div>
                <label className="label">Type de choix</label>
                <select className="input" value={g.type || 'single'} onChange={(e) => updateGroup(gi, { type: e.target.value })}>
                  <option value="single">Choix unique (une seule option)</option>
                  <option value="multi">Choix multiple (plusieurs options)</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2">
                  <input type="checkbox" checked={!!g.required} onChange={(e) => updateGroup(gi, { required: e.target.checked })} />
                  <span className="text-sm">Obligatoire</span>
                </label>
              </div>
              {g.type === 'multi' && (
                <>
                  <div>
                    <label className="label">Minimum à choisir</label>
                    <input className="input" type="number" min="0" value={g.min ?? ''} onChange={(e) => updateGroup(gi, { min: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Maximum à choisir</label>
                    <input className="input" type="number" min="0" value={g.max ?? ''} onChange={(e) => updateGroup(gi, { max: e.target.value })} />
                  </div>
                </>
              )}
            </div>

            <div className="mt-3">
              <label className="label">Choix proposés</label>
              <div className="space-y-1.5">
                {(g.choices || []).map((c, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <input className="input flex-1" value={c.label || ''} placeholder="Libellé (ex : Frites)"
                      onChange={(e) => updateChoice(gi, ci, { label: e.target.value })} />
                    <div className="flex items-center gap-1">
                      <input className="input w-24" type="number" min="0" value={c.price ?? 0} placeholder="Prix +"
                        onChange={(e) => updateChoice(gi, ci, { price: e.target.value })} />
                      <span className="text-xs text-slate-400">KMF</span>
                    </div>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => removeChoice(gi, ci)}>✕</button>
                  </div>
                ))}
              </div>
              <button type="button" className="mt-2 text-sm text-brand-600 hover:underline" onClick={() => addChoice(gi)}>+ Ajouter un choix</button>
            </div>

            <div className="mt-3 text-right">
              <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => removeGroup(gi)}>Supprimer ce groupe</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
