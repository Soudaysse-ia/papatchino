import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

// Protège les pages staff. `roles` = rôles autorisés.
// Empêche tout accès par manipulation d'URL (redirection vers /connexion).
export default function ProtectedRoute({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <div className="p-8 text-center text-slate-500">Chargement…</div>;
  }
  if (!user) {
    return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/acces-refuse" replace />;
  }
  return children;
}
