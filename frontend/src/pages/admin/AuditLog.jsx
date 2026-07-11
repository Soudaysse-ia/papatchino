import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatDateTime } from '../../lib/format.js';

// Libellés lisibles des types d'action.
const ACTION_LABELS = {
  connexion: 'Connexion',
  commande_creation: 'Création de commande',
  commande_statut: 'Changement de statut',
  commande_paiement: 'Encaissement',
  menu_ajout: 'Ajout au menu',
  menu_modif: 'Modification du menu',
  menu_suppression: 'Suppression du menu',
  menu_disponibilite: 'Disponibilité modifiée',
  table_creation: 'Création de table',
  table_suppression: 'Suppression de table',
  utilisateur_creation: 'Création utilisateur',
  utilisateur_suppression: 'Suppression utilisateur',
  menu_photo: 'Téléversement de photo',
  menu_chargement_defaut: 'Chargement du menu par défaut',
  commandes_reinitialisation: 'Réinitialisation des commandes',
  journal_effacement: 'Effacement du journal',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [filters, setFilters] = useState({ action: '', user: '', date: '' });
  const [error, setError] = useState('');

  async function load() {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v); });
    try { setLogs(await api.get(`/logs?${qs.toString()}`)); }
    catch (e) { setError(e.message); }
  }

  async function clearLogs() {
    if (!confirm("Effacer TOUT le journal d'audit ?\n\nCette action est irréversible. Une entrée traçant l'effacement (par qui, quand) sera conservée.")) return;
    try {
      await api.del('/logs');
      api.get('/logs/actions').then(setActions).catch(() => {});
      load();
    } catch (e) { alert(e.message); }
  }
  useEffect(() => { api.get('/logs/actions').then(setActions).catch(() => {}); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters]);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Journal d'audit</h1>
          <p className="text-sm text-slate-500">
            Toutes les actions du personnel sont enregistrées (connexions, commandes, encaissements, modifications du menu…).
          </p>
        </div>
        <button className="btn-danger" onClick={clearLogs}>Effacer le journal</button>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <label className="label">Type d'action</label>
          <select className="input" value={filters.action} onChange={(e) => set('action', e.target.value)}>
            <option value="">Toutes</option>
            {actions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Utilisateur</label>
          <input className="input" value={filters.user} onChange={(e) => set('user', e.target.value)} placeholder="Identifiant" />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={filters.date} onChange={(e) => set('date', e.target.value)} />
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Date & heure</th><th className="p-3">Utilisateur</th>
              <th className="p-3">Action</th><th className="p-3">Détails</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 whitespace-nowrap text-slate-500">{formatDateTime(l.timestamp)}</td>
                <td className="p-3 font-medium">{l.username || '—'}</td>
                <td className="p-3">{ACTION_LABELS[l.action] || l.action}</td>
                <td className="p-3 text-slate-600">{l.details}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-slate-400">Aucune entrée.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
