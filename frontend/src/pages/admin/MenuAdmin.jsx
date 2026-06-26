import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatPrice } from '../../lib/format.js';

const EMPTY = {
  name: '', description: '', price: '', category: 'Plats', photo_url: '',
  is_available: true, stock_quantity: 0, low_stock_threshold: 5,
};
const CATEGORIES = ['Entrées', 'Plats', 'Boissons', 'Desserts', 'Autres'];

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

  const byCat = {};
  for (const m of items) (byCat[m.category] ||= []).push(m);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Gestion du menu & stock</h1>
        <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}>+ Ajouter un plat</button>
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
                    <td className="p-3 font-medium">{m.name}</td>
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
            <label className="label">URL de la photo</label>
            <input className="input" value={form.photo_url} onChange={(e) => set('photo_url', e.target.value)} placeholder="https://…" />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_available} onChange={(e) => set('is_available', e.target.checked)} />
              <span className="text-sm">Disponible à la commande</span>
            </label>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.name.trim()}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
