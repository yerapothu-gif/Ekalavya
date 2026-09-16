import { NavLink } from 'react-router-dom';

const NAV_BY_ROLE = {
  student: [{ to: '/student', label: 'Dashboard' }],
  mentor: [{ to: '/mentor', label: 'Dashboard' }],
  teacher: [{ to: '/mentor', label: 'Dashboard' }],
  admin: [{ to: '/admin', label: 'Dashboard' }],
};

export default function Sidebar({ role }) {
  const links = NAV_BY_ROLE[role] || [];

  return (
    <aside
      style={{
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '20px 16px',
      }}
    >
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, marginBottom: 24 }}>
        Eklavya
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              padding: '8px 10px',
              borderRadius: 'var(--radius)',
              color: isActive ? '#fff' : 'var(--text)',
              background: isActive ? 'var(--accent)' : 'transparent',
              textDecoration: 'none',
              fontWeight: 500,
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
