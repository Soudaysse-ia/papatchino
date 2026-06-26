import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';

const ROLE_LABELS = { admin: 'Administrateur', cashier: 'Caisse', kitchen: 'Cuisine' };

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'cashier' });
  const [error, setError] = useState('');

  async function load() { try { setUsers(await api.get('/users')); } catch (e) { setError(e.message); } }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    try {
      await api.post('/users', form);
      setForm({ username: '', password: '', role: 'cashier' });
      load();
    } catch (e) { alert(e.message); }
  }

  async function remove(u) {
    if (!confirm(`Supprimer le compte "${u.username}" ?`)) return;
    try { await api.del(`/users/${u.id}`); load(); } catch (e) { alert(e.message); }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Utilisateurs</h1>
      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={create} className="card grid gap-3 p-4 sm:grid-cols-4">
        <div>
          <label className="label">Identifiant</label>
          <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <label className="label">Rôle</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="cashier">Caisse</option>
            <option value="kitchen">Cuisine</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full">Créer le compte</button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="p-3">Identifiant</th><th className="p-3">Rôle</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.username}</td>
                <td className="p-3">{ROLE_LABELS[u.role] || u.role}</td>
                <td className="p-3 text-right">
                  {u.id !== me.id ? (
                    <button className="text-red-600 hover:underline" onClick={() => remove(u)}>Supprimer</button>
                  ) : (
                    <span className="text-xs text-slate-400">vous</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
