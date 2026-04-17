export const ROLE_KEYS = {
  ADMIN: "ADMIN",
  PHARMACIEN: "PHARMACIEN",
  GESTIONNAIRE_STOCK: "GESTIONNAIRE_STOCK",
  PREPARATEUR: "PREPARATEUR",
  MEDECIN: "MEDECIN",
  RESPONSABLE_REPORTING: "RESPONSABLE_REPORTING",
};

export const PERMISSIONS = {
  PRODUCTS_READ: "products.read",
  PRODUCTS_MANAGE: "products.manage",
  STOCK_READ: "stock.read",
  STOCK_MANAGE: "stock.manage",
  STOCKLOTS_READ: "stocklots.read",
  MOVEMENTS_READ: "movements.read",
  DISTRIBUTIONS_READ: "distributions.read",
  DISTRIBUTIONS_MANAGE: "distributions.manage",
  INVENTORIES_READ: "inventories.read",
  INVENTORIES_MANAGE: "inventories.manage",
  SUPPLY_READ: "supply.read",
  ANALYTICS_READ: "analytics.read",
  USERS_MANAGE: "users.manage",
  ADMIN_ACCESS: "admin.access",
};

export const ROLE_DEFINITIONS = {
  1: {
    key: ROLE_KEYS.ADMIN,
    label: "Administrator",
    permissions: Object.values(PERMISSIONS),
  },
  2: {
    key: ROLE_KEYS.PHARMACIEN,
    label: "Pharmacien",
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.STOCK_READ,
      PERMISSIONS.STOCKLOTS_READ,
      PERMISSIONS.MOVEMENTS_READ,
      PERMISSIONS.DISTRIBUTIONS_READ,
      PERMISSIONS.DISTRIBUTIONS_MANAGE,
      PERMISSIONS.INVENTORIES_READ,
      PERMISSIONS.SUPPLY_READ,
      PERMISSIONS.ANALYTICS_READ,
    ],
  },
  3: {
    key: ROLE_KEYS.PREPARATEUR,
    label: "Preparateur",
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.STOCK_READ,
      PERMISSIONS.STOCKLOTS_READ,
      PERMISSIONS.MOVEMENTS_READ,
      PERMISSIONS.DISTRIBUTIONS_READ,
      PERMISSIONS.SUPPLY_READ,
      PERMISSIONS.ANALYTICS_READ,
    ],
  },
  4: {
    key: ROLE_KEYS.GESTIONNAIRE_STOCK,
    label: "Gestionnaire stock",
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.STOCK_READ,
      PERMISSIONS.STOCK_MANAGE,
      PERMISSIONS.STOCKLOTS_READ,
      PERMISSIONS.MOVEMENTS_READ,
      PERMISSIONS.INVENTORIES_READ,
      PERMISSIONS.INVENTORIES_MANAGE,
      PERMISSIONS.SUPPLY_READ,
      PERMISSIONS.ANALYTICS_READ,
    ],
  },
  5: {
    key: ROLE_KEYS.MEDECIN,
    label: "Medecin",
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.STOCK_READ,
      PERMISSIONS.DISTRIBUTIONS_READ,
      PERMISSIONS.ANALYTICS_READ,
    ],
  },
  6: {
    key: ROLE_KEYS.RESPONSABLE_REPORTING,
    label: "Responsable reporting",
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.STOCK_READ,
      PERMISSIONS.STOCKLOTS_READ,
      PERMISSIONS.MOVEMENTS_READ,
      PERMISSIONS.DISTRIBUTIONS_READ,
      PERMISSIONS.INVENTORIES_READ,
      PERMISSIONS.SUPPLY_READ,
      PERMISSIONS.ANALYTICS_READ,
    ],
  },
};

export const DEFAULT_ROLE_ID = 2;

function unique(values) {
  return [...new Set(values)];
}

export function getRoleDefinitionById(roleId) {
  return ROLE_DEFINITIONS[Number(roleId)] || null;
}

export function getRoleDefinitionByKey(roleKey) {
  return Object.entries(ROLE_DEFINITIONS).find(([, value]) => value.key === roleKey)?.[1] || null;
}

export function getRoleKeysFromIds(roleIds = []) {
  return unique(
    roleIds.map((roleId) => {
      const definition = getRoleDefinitionById(roleId);
      return definition ? definition.key : `ROLE_${roleId}`;
    })
  );
}

export function getRoleIdsFromKeys(roleKeys = []) {
  return unique(
    roleKeys
      .map((roleKey) =>
        Object.entries(ROLE_DEFINITIONS).find(([, value]) => value.key === roleKey)?.[0]
      )
      .filter(Boolean)
      .map((roleId) => Number(roleId))
  );
}

export function getPermissionsFromRoleKeys(roleKeys = []) {
  const permissions = roleKeys.flatMap((roleKey) => {
    const definition = getRoleDefinitionByKey(roleKey);
    return definition ? definition.permissions : [];
  });

  return unique(permissions);
}

export function buildAccessFromRoleIds(roleIds = []) {
  const normalizedRoleIds = unique(roleIds.map((roleId) => Number(roleId)).filter(Number.isFinite));
  const roles = getRoleKeysFromIds(normalizedRoleIds);
  const permissions = getPermissionsFromRoleKeys(roles);

  return {
    roleIds: normalizedRoleIds,
    roles,
    permissions,
  };
}

export function buildAccessFromRoleKeys(roleKeys = []) {
  const roles = unique(roleKeys.filter(Boolean));
  const roleIds = getRoleIdsFromKeys(roles);
  const permissions = getPermissionsFromRoleKeys(roles);

  return {
    roleIds,
    roles,
    permissions,
  };
}

export function hasRole(userLike, roleKey) {
  return Boolean(userLike?.roles?.includes(roleKey));
}

export function hasPermission(userLike, permissionKey) {
  return Boolean(userLike?.permissions?.includes(permissionKey));
}

export function normalizeAuthPayload(payload = {}) {
  const hasStringRoles = Array.isArray(payload.roles) && payload.roles.every((role) => typeof role === "string");

  if (hasStringRoles) {
    const access = buildAccessFromRoleKeys(payload.roles);
    return {
      ...payload,
      roleIds: Array.isArray(payload.roleIds) && payload.roleIds.length > 0 ? payload.roleIds : access.roleIds,
      roles: access.roles,
      permissions:
        Array.isArray(payload.permissions) && payload.permissions.length > 0
          ? unique(payload.permissions)
          : access.permissions,
    };
  }

  const rawRoleIds = Array.isArray(payload.roleIds) && payload.roleIds.length > 0 ? payload.roleIds : payload.roles;
  const access = buildAccessFromRoleIds(Array.isArray(rawRoleIds) ? rawRoleIds : []);

  return {
    ...payload,
    roleIds: access.roleIds,
    roles: access.roles,
    permissions: access.permissions,
  };
}

export function listAssignableRoles() {
  return Object.entries(ROLE_DEFINITIONS).map(([id, definition]) => ({
    id: Number(id),
    key: definition.key,
    label: definition.label,
    permissions: definition.permissions,
  }));
}
