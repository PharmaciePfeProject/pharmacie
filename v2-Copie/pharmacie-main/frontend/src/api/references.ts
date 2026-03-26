import { api } from "./axios";
import type {
  DciReference,
  Location,
  MovementType,
  PharmaClass,
  ProductTypeReference,
} from "@/types/references";

export async function fetchLocations() {
  const res = await api.get<{ items: Location[] }>("/api/locations");
  return res.data.items;
}

export async function createLocation(payload: Pick<Location, "lib">) {
  const res = await api.post<{ item: Location }>("/api/locations", payload);
  return res.data.item;
}

export async function fetchMovementTypes() {
  const res = await api.get<{ items: MovementType[] }>("/api/movement-types");
  return res.data.items;
}

export async function createMovementType(payload: Pick<MovementType, "label">) {
  const res = await api.post<{ item: MovementType }>("/api/movement-types", payload);
  return res.data.item;
}

export async function fetchPharmaClasses() {
  const res = await api.get<{ items: PharmaClass[] }>("/api/pharma-classes");
  return res.data.items;
}

export async function fetchProductTypes() {
  const res = await api.get<{ items: ProductTypeReference[] }>("/api/product-types");
  return res.data.items;
}

export async function fetchDci() {
  const res = await api.get<{ items: DciReference[] }>("/api/dci");
  return res.data.items;
}
