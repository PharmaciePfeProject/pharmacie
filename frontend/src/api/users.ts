import { api } from "./axios";
import type { UsersListResponse } from "@/types/users";
import type { RoleKey } from "@/lib/roles";

export async function fetchUsers() {
  const response = await api.get<UsersListResponse>("/api/users");
  return response.data;
}

export async function updateUserRoles(userId: number, roles: RoleKey[]) {
  const response = await api.put<{ user: UsersListResponse["items"][number] }>(`/api/users/${userId}/roles`, {
    roles,
  });

  return response.data.user;
}
