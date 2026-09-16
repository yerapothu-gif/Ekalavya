import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Guards a route to a set of allowed roles. Redirects unauthenticated users
// to /login and authenticated-but-wrong-role users back to their own home.
export default function RoleRoute({ allowedRoles, children }) {
  const { session, role, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return children;
}
