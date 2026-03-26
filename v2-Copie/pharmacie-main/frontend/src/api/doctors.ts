import { api } from "./axios";
import type {
  CreateDoctorPayload,
  Doctor,
  DoctorFilters,
  DoctorsListResponse,
  UpdateDoctorPayload,
} from "@/types/doctors";

export async function fetchDoctors(filters: DoctorFilters = {}) {
  const response = await api.get<DoctorsListResponse>("/api/doctors", { params: filters });
  return response.data;
}

export async function createDoctorRecord(payload: CreateDoctorPayload) {
  const response = await api.post<{ item: Doctor }>("/api/doctors", payload);
  return response.data.item;
}

export async function updateDoctorRecord(doctorId: number, payload: UpdateDoctorPayload) {
  const response = await api.put<{ item: Doctor }>(`/api/doctors/${doctorId}`, payload);
  return response.data.item;
}

export async function toggleDoctorActive(doctorId: number) {
  const response = await api.patch<{ item: Doctor }>(`/api/doctors/${doctorId}/toggle-active`);
  return response.data.item;
}
