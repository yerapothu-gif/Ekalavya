// Usage: requireRole('admin') or requireRole('mentor', 'admin')
// Must run after requireAuth, which sets req.profile.role.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!allowedRoles.includes(req.profile.role)) {
      return res.status(403).json({ error: 'Forbidden for this role' });
    }
    next();
  };
}

module.exports = requireRole;
