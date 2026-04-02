import type { PermissionKey, RoleKey } from "@/lib/roles";

export type AdminUser = {
  id: number;
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  function: string | null;
  functionName?: string | null;
  actived: number;
  roleIds: number[];
  roles: RoleKey[];
  permissions: PermissionKey[];
};

export type AvailableRole = {
  id: number;
  key: RoleKey;
  label: string;
  permissions: PermissionKey[];
};

export type UsersListResponse = {
  items: AdminUser[];
  availableRoles: AvailableRole[];
};
