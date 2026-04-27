import { api } from "./axios";
function normalizeLocation(raw) {
    return {
        location_id: raw?.location_id ?? raw?.LOCATION_ID ?? raw?.id ?? raw?.ID ?? null,
        lib: raw?.lib ?? raw?.LIB ?? null,
    };
}
function normalizeMovementType(raw) {
    return {
        movement_type_id: raw?.movement_type_id ?? raw?.MOVEMENT_TYPE_ID ?? null,
        label: raw?.label ?? raw?.LABEL ?? null,
    };
}
function normalizePharmaClass(raw) {
    return {
        pharma_class_id: raw?.pharma_class_id ?? raw?.PHARMA_CLASS_ID ?? null,
        label: raw?.label ?? raw?.LABEL ?? null,
    };
}
function normalizeProductType(raw) {
    return {
        product_type_id: raw?.product_type_id ?? raw?.PRODUCT_TYPE_ID ?? null,
        label: raw?.label ?? raw?.LABEL ?? null,
    };
}
function normalizeDci(raw) {
    return {
        dci_id: raw?.dci_id ?? raw?.DCI_ID ?? null,
        label: raw?.label ?? raw?.LABEL ?? null,
    };
}
export async function fetchLocations() {
    const res = await api.get("/api/locations");
    return (res.data.items || []).map(normalizeLocation);
}
export async function createLocation(payload) {
    const res = await api.post("/api/locations", payload);
    return res.data.item;
}
export async function fetchMovementTypes() {
    const res = await api.get("/api/movement-types");
    return (res.data.items || []).map(normalizeMovementType);
}
export async function createMovementType(payload) {
    const res = await api.post("/api/movement-types", payload);
    return res.data.item;
}
export async function fetchPharmaClasses() {
    const res = await api.get("/api/pharma-classes");
    return (res.data.items || []).map(normalizePharmaClass);
}
export async function fetchProductTypes() {
    const res = await api.get("/api/product-types");
    return (res.data.items || []).map(normalizeProductType);
}
export async function fetchDci() {
    const res = await api.get("/api/dci");
    return (res.data.items || []).map(normalizeDci);
}
