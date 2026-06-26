import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      // Redirection selon le rôle.
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'cashier') navigate('/caisse');
      else if (user.role === 'kitchen') navigate('/cuisine');
      else navigate('/');
    } catch (err) {
      setError(err.message || 'Échec de la connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <img src="/logo.svg" alt="Papatchino" className="mx-auto h-16 w-auto max-w-[240px]" />
          <h1 className="mt-4 text-xl font-bold text-slate-800">Connexion au personnel</h1>
          <p className="text-sm text-slate-500">Caisse · Cuisine · Administration</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Identifiant</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)}
              autoFocus autoComplete="username" required />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <Link to="/" className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-700">
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
