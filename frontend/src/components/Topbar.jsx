import { useAuth } from '../context/AuthContext.jsx';

export default function Topbar() {
  const { profile, logout } = useAuth();

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <div style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
        {profile?.role ? `${profile.role} dashboard` : ''}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>{profile?.full_name}</span>
        <button className="secondary" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
