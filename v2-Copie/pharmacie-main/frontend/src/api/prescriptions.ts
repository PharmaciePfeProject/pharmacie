import { api } from "./axios";
import type { PaginatedResponse } from "@/types/pagination";
import type {
  CreatePrescriptionPayload,
  Prescription,
  PrescriptionAgent,
  PrescriptionType,
  PrescriptionDoctor,
} from "@/types/prescriptions";

type PrescriptionFilters = {
  doctor_id?: number;
  product_id?: number;
  prescription_number?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchPrescriptions(filters: PrescriptionFilters = {}) {
  const res = await api.get<PaginatedResponse<Prescription>>("/api/prescriptions", {
    params: filters,
  });
  return res.data;
}

export async function createPrescription(payload: CreatePrescriptionPayload) {
  const res = await api.post<{ item: Prescription }>("/api/prescriptions", payload);
  return res.data.item;
}

export async function fetchPrescriptionDoctors() {
  const res = await api.get<{ items: PrescriptionDoctor[] }>("/api/prescriptions/doctors");
  return res.data.items;
}

export async function fetchPrescriptionAgents() {
  const res = await api.get<{ items: PrescriptionAgent[] }>("/api/prescriptions/agents");
  return res.data.items;
}

export async function fetchPrescriptionTypes() {
  const res = await api.get<{ items: PrescriptionType[] }>("/api/prescriptions/types");
  return res.data.items;
}
