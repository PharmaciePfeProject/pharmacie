export function requireRole(allowedRoleIds = []) {
  return (req, res, next) => {
    // requireAuth must run before this, so req.user exists
    const roles = req.user?.roles || [];

    const ok = roles.some((r) => allowedRoleIds.includes(r));
    if (!ok) {
      return res.status(403).json({
        message: "Forbidden: insufficient role",
        required: allowedRoleIds,
        has: roles,
      });
    }

    next();
  };
}