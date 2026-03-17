export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];

    const ok = roles.some((roleKey) => allowedRoles.includes(roleKey));
    if (!ok) {
      return res.status(403).json({
        message: "Forbidden: insufficient role",
        required: allowedRoles,
        has: roles,
      });
    }

    next();
  };
}
