import { api } from "./axios";
export async function fetchUsers() {
    const response = await api.get("/api/users");
    return response.data;
}
export async function updateUserRoles(userId, roles) {
    const response = await api.put(`/api/users/${userId}/roles`, {
        roles,
    });
    return response.data.user;
}
export async function updateManagedUser(userId, payload) {
    const response = await api.put(`/api/users/${userId}`, payload);
    return response.data.user;
}
export async function updateUserStatus(userId, actived) {
    const response = await api.patch(`/api/users/${userId}/status`, {
        actived,
    });
    return response.data.user;
}
export async function deleteManagedUser(userId) {
    const response = await api.delete(`/api/users/${userId}`);
    return response.data;
}
export async function updateUserDepot(userId, locationId) {
    const response = await api.put(`/api/users/${userId}/depot`, {
        locationId,
    });
    return response.data.user;
}
export async function createDoctor(payload) {
    const response = await api.post("/api/users", {
        ...payload,
        role: "MEDECIN",
    });
    return response.data.user;
}
export async function createManagedUser(payload) {
    const response = await api.post("/api/users", payload);
    return response.data.user;
}
