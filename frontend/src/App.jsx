import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import CustomerMenu from './pages/CustomerMenu.jsx';
import OrderTracking from './pages/OrderTracking.jsx';
import Login from './pages/Login.jsx';
import Cashier from './pages/Cashier.jsx';
import Kitchen from './pages/Kitchen.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import MenuAdmin from './pages/admin/MenuAdmin.jsx';
import TablesAdmin from './pages/admin/TablesAdmin.jsx';
import UsersAdmin from './pages/admin/UsersAdmin.jsx';
import OrdersHistory from './pages/admin/OrdersHistory.jsx';
import AuditLog from './pages/admin/AuditLog.jsx';

export default function App() {
  return (
    <Routes>
      {/* Espace public (clients) */}
      <Route path="/" element={<Navigate to="/menu" replace />} />
      <Route path="/staff" element={<StaffHub />} />
      <Route path="/menu" element={<CustomerMenu />} />
      <Route path="/suivi/:id" element={<OrderTracking />} />

      {/* Authentification */}
      <Route path="/connexion" element={<Login />} />
      <Route path="/acces-refuse" element={<AccessDenied />} />

      {/* Caisse */}
      <Route path="/caisse" element={
        <ProtectedRoute roles={['cashier', 'admin']}><Cashier /></ProtectedRoute>
      } />

      {/* Cuisine */}
      <Route path="/cuisine" element={
        <ProtectedRoute roles={['kitchen', 'admin']}><Kitchen /></ProtectedRoute>
      } />

      {/* Administration */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="menu" element={<MenuAdmin />} />
        <Route path="tables" element={<TablesAdmin />} />
        <Route path="utilisateurs" element={<UsersAdmin />} />
        <Route path="commandes" element={<OrdersHistory />} />
        <Route path="journal" element={<AuditLog />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function StaffHub() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[#FBF3E4] p-6 text-center">
      <div className="mb-8 animate-fade-up">
        <img src="/logo.svg" alt="Papatchino" className="mx-auto h-24 w-auto max-w-[320px]" />
        <p className="mt-3 text-slate-500">Espace personnel</p>
      </div>
      <div className="grid w-full max-w-md animate-fade-up gap-3" style={{ animationDelay: '100ms' }}>
        <Link to="/caisse" className="rounded-full bg-white py-3 font-semibold text-slate-700 shadow-sm ring-1 ring-black/5 transition hover:bg-gold-50 active:scale-95">Espace Caisse</Link>
        <Link to="/cuisine" className="rounded-full bg-white py-3 font-semibold text-slate-700 shadow-sm ring-1 ring-black/5 transition hover:bg-gold-50 active:scale-95">Écran Cuisine</Link>
        <Link to="/admin" className="rounded-full bg-white py-3 font-semibold text-slate-700 shadow-sm ring-1 ring-black/5 transition hover:bg-gold-50 active:scale-95">Administration</Link>
      </div>
    </div>
  );
}

function AccessDenied() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
      <p className="mt-2 text-slate-600">
        Vous n'avez pas les droits pour accéder à cette page.
      </p>
      {user && (
        <p className="mt-1 text-sm text-slate-500">
          Connecté en tant que <strong>{user.username}</strong> (rôle : {user.role}).
          Connectez-vous avec un compte autorisé.
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/connexion" className="btn-primary" onClick={() => logout()}>
          Changer de compte
        </Link>
        <Link to="/staff" className="btn-secondary">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
