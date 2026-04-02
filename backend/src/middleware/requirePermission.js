export function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    const permissions = req.user?.permissions || [];
    const ok = requiredPermissions.some((permissionKey) => permissions.includes(permissionKey));

    if (!ok) {
      return res.status(403).json({
        message: "Forbidden: insufficient permission",
        required: requiredPermissions,
        has: permissions,
      });
    }

    next();
  };
}
