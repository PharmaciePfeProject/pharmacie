import { api } from "./axios";

export async function updateMyProfile(payload) {
  const response = await api.put("/api/auth/me", payload);
  return response.data.user;
}

export async function updateMyPassword(payload) {
  const response = await api.put("/api/auth/me/password", payload);
  return response.data;
}
