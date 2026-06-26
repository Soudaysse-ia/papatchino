import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import OnlineBadge from '../../components/OnlineBadge.jsx';

const LINKS = [
  { to: '/admin', label: 'Tableau de bord', end: true },
  { to: '/admin/commandes', label: 'Historique des commandes' },
  { to: '/admin/menu', label: 'Gestion du menu & stock' },
  { to: '/admin/tables', label: 'Tables & QR codes' },
  { to: '/admin/utilisateurs', label: 'Utilisateurs' },
  { to: '/admin/journal', label: "Journal d'audit" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="border-b bg-white md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 border-b p-4">
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <div>
            <p className="font-bold text-slate-800">Administration</p>
            <p className="text-xs text-slate-500">{user?.username}</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1 p-2 md:flex-col">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 md:mt-auto">
          <button className="btn-secondary w-full" onClick={() => { logout(); navigate('/connexion'); }}>
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3">
          <img src="/logo.svg" alt="Papatchino" className="h-8 w-auto" />
          <OnlineBadge />
        </header>
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
