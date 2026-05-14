import {
  ROLE_KEYS,
  PERMISSIONS,
  applyFunctionScopedPermissions,
  normalizeAuthPayload,
} from "../src/utils/rbac.js";

describe("rbac utils", () => {
  test("removes prescriptions approval for DEPOT pharmacists", () => {
    const roles = [ROLE_KEYS.PHARMACIEN];
    const permissions = [PERMISSIONS.PRESCRIPTIONS_APPROVE, PERMISSIONS.SUPPLY_MANAGE];

    const scoped = applyFunctionScopedPermissions(roles, permissions, "DEPOT");

    expect(scoped).toContain(PERMISSIONS.SUPPLY_MANAGE);
    expect(scoped).not.toContain(PERMISSIONS.PRESCRIPTIONS_APPROVE);
  });

  test("keeps prescriptions approval for PRESCRIPTIONS pharmacists", () => {
    const roles = [ROLE_KEYS.PHARMACIEN];
    const permissions = [PERMISSIONS.SUPPLY_MANAGE];

    const scoped = applyFunctionScopedPermissions(roles, permissions, "PRESCRIPTIONS");

    expect(scoped).toContain(PERMISSIONS.SUPPLY_MANAGE);
    expect(scoped).toContain(PERMISSIONS.PRESCRIPTIONS_APPROVE);
  });

  test("normalizes string roles into roleIds and permissions", () => {
    const payload = normalizeAuthPayload({
      id: 7,
      roles: [ROLE_KEYS.ADMIN],
      functionName: "",
    });

    expect(payload.roleIds).toEqual([1]);
    expect(payload.roles).toEqual([ROLE_KEYS.ADMIN]);
    expect(payload.permissions).toContain(PERMISSIONS.ADMIN_ACCESS);
    expect(payload.permissions).toContain(PERMISSIONS.USERS_MANAGE);
  });
});
