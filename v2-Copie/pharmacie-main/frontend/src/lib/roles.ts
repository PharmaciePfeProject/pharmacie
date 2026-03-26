export const ROLES = {
  ADMIN: "ADMIN",
  PHARMACIEN: "PHARMACIEN",
  GESTIONNAIRE_STOCK: "GESTIONNAIRE_STOCK",
  PREPARATEUR: "PREPARATEUR",
  MEDECIN: "MEDECIN",
  RESPONSABLE_REPORTING: "RESPONSABLE_REPORTING",
} as const;

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
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];
export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

type UserLike = {
  roles?: string[] | null;
  permissions?: string[] | null;
};

export function hasRole(user: UserLike | null | undefined, roleKey: RoleKey) {
  return Boolean(user?.roles?.includes(roleKey));
}

export function hasPermission(user: UserLike | null | undefined, permissionKey: PermissionKey) {
  return Boolean(user?.permissions?.includes(permissionKey));
}
