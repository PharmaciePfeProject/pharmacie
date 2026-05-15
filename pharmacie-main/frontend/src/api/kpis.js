import { api } from "./axios";

export async function getStockKPIs() {
  const response = await api.get("/api/kpis/stock");
  return response.data;
}

export async function getPrescriptionsKPIs() {
  const response = await api.get("/api/kpis/prescriptions");
  return response.data;
}

export async function getDistributionKPIs() {
  const response = await api.get("/api/kpis/distributions");
  return response.data;
}

export async function getReportingKPIs() {
  const response = await api.get("/api/kpis/reporting");
  return response.data;
}

export async function getAllKPIs() {
  const response = await api.get("/api/kpis");
  return response.data;
}
