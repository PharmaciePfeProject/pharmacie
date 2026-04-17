export const ROLES = {
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
    PRESCRIPTIONS_READ: "prescriptions.read",
    PRESCRIPTIONS_MANAGE: "prescriptions.manage",
    PRESCRIPTIONS_APPROVE: "prescriptions.approve",
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
    DOCTORS_MANAGE: "doctors.manage",
    ADMIN_ACCESS: "admin.access",
};
export function hasRole(user, roleKey) {
    return Boolean(user?.roles?.includes(roleKey));
}
export function hasPermission(user, permissionKey) {
    return Boolean(user?.permissions?.includes(permissionKey));
}
