import { api } from "./axios";
import type {
  DciReference,
  Location,
  MovementType,
  PharmaClass,
  ProductTypeReference,
} from "@/types/references";

function normalizeLocation(raw: any): Location {
  return {
    location_id: raw?.location_id ?? raw?.LOCATION_ID ?? null,
    lib: raw?.lib ?? raw?.LIB ?? null,
  };
}

function normalizeMovementType(raw: any): MovementType {
  return {
    movement_type_id: raw?.movement_type_id ?? raw?.MOVEMENT_TYPE_ID ?? null,
    label: raw?.label ?? raw?.LABEL ?? null,
  };
}

function normalizePharmaClass(raw: any): PharmaClass {
  return {
    pharma_class_id: raw?.pharma_class_id ?? raw?.PHARMA_CLASS_ID ?? null,
    label: raw?.label ?? raw?.LABEL ?? null,
  };
}

function normalizeProductType(raw: any): ProductTypeReference {
  return {
    product_type_id: raw?.product_type_id ?? raw?.PRODUCT_TYPE_ID ?? null,
    label: raw?.label ?? raw?.LABEL ?? null,
  };
}

function normalizeDci(raw: any): DciReference {
  return {
    dci_id: raw?.dci_id ?? raw?.DCI_ID ?? null,
    label: raw?.label ?? raw?.LABEL ?? null,
  };
}

export async function fetchLocations() {
  const res = await api.get<{ items: Location[] }>("/api/locations");
  return (res.data.items || []).map(normalizeLocation);
}

export async function createLocation(payload: Pick<Location, "lib">) {
  const res = await api.post<{ item: Location }>("/api/locations", payload);
  return res.data.item;
}

export async function fetchMovementTypes() {
  const res = await api.get<{ items: MovementType[] }>("/api/movement-types");
  return (res.data.items || []).map(normalizeMovementType);
}

export async function createMovementType(payload: Pick<MovementType, "label">) {
  const res = await api.post<{ item: MovementType }>("/api/movement-types", payload);
  return res.data.item;
}

export async function fetchPharmaClasses() {
  const res = await api.get<{ items: PharmaClass[] }>("/api/pharma-classes");
  return (res.data.items || []).map(normalizePharmaClass);
}

export async function fetchProductTypes() {
  const res = await api.get<{ items: ProductTypeReference[] }>("/api/product-types");
  return (res.data.items || []).map(normalizeProductType);
}

export async function fetchDci() {
  const res = await api.get<{ items: DciReference[] }>("/api/dci");
  return (res.data.items || []).map(normalizeDci);
}
