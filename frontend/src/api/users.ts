import { api } from "./axios";
import type { UsersListResponse } from "@/types/users";
import type { RoleKey } from "@/lib/roles";

type CreateDoctorPayload = {
  email: string;
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  functionName?: string;
};

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

export async function createDoctor(payload: CreateDoctorPayload) {
  const response = await api.post<{ user: UsersListResponse["items"][number] }>("/api/users/doctors", payload);
  return response.data.user;
}
