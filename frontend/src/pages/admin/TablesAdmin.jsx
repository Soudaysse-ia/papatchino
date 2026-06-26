import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function TablesAdmin() {
  const [tables, setTables] = useState([]);
  const [name, setName] = useState('');
  const [qr, setQr] = useState(null); // { table, url, dataUrl }
  const [error, setError] = useState('');

  async function load() { try { setTables(await api.get('/tables')); } catch (e) { setError(e.message); } }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try { await api.post('/tables', { name: name.trim() }); setName(''); load(); }
    catch (e) { alert(e.message); }
  }

  async function remove(t) {
    if (!confirm(`Supprimer "${t.name}" ?`)) return;
    try { await api.del(`/tables/${t.id}`); load(); } catch (e) { alert(e.message); }
  }

  async function showQr(t) {
    try { setQr(await api.get(`/tables/${t.id}/qrcode`)); } catch (e) { alert(e.message); }
  }

  function download(dataUrl, label) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${label.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Tables & QR codes</h1>
      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={create} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1">
          <label className="label">Nom de la nouvelle table</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Table 7, Terrasse 2…" />
        </div>
        <button className="btn-primary">Créer la table</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{t.name}</h3>
              <button className="text-sm text-red-600 hover:underline" onClick={() => remove(t)}>Supprimer</button>
            </div>
            <p className="mt-1 break-all text-xs text-slate-400">{t.menu_url}</p>
            <button className="btn-secondary mt-3 w-full" onClick={() => showQr(t)}>Afficher le QR code</button>
          </div>
        ))}
        {tables.length === 0 && <p className="text-slate-400">Aucune table pour le moment.</p>}
      </div>

      {qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQr(null)}>
          <div className="card w-full max-w-xs p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-lg font-bold">{qr.table}</h2>
            <img src={qr.dataUrl} alt={`QR ${qr.table}`} className="mx-auto w-full max-w-[240px]" />
            <p className="mt-2 break-all text-xs text-slate-400">{qr.url}</p>
            <button className="btn-primary mt-4 w-full" onClick={() => download(qr.dataUrl, qr.table)}>Télécharger le PNG</button>
            <button className="btn-secondary mt-2 w-full" onClick={() => setQr(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
