export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

export function requireTreasurerOrAdmin(req, res, next) {
  return requireRole('admin', 'treasurer')(req, res, next);
}
