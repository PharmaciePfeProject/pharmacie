import { useCallback, useEffect, useState } from "react";
import {
  fetchPrescriptionAgents,
  fetchPrescriptionDoctors,
  fetchPrescriptionTypes,
  fetchPrescriptions,
} from "@/api/prescriptions";
import { fetchProducts } from "@/api/products";
import { createDefaultPagination } from "@/lib/pagination";

export const usePrescriptionsData = ({
  canApprove,
  loadPendingApprovals,
  setPendingApprovals,
  setError,
  t,
}) => {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [agents, setAgents] = useState([]);
  const [types, setTypes] = useState([]);
  const [pagination, setPagination] = useState(createDefaultPagination());
  const [loading, setLoading] = useState(true);

  const [prescriptionSearch, setPrescriptionSearch] = useState("");
  const [activePrescriptionSearch, setActivePrescriptionSearch] = useState("");
  const [patientNameSearch, setPatientNameSearch] = useState("");
  const [activePatientNameSearch, setActivePatientNameSearch] = useState("");

  const loadData = useCallback(
    async (
      page = 1,
      pageSize = 10,
      prescriptionNumber = activePrescriptionSearch,
      patientName = activePatientNameSearch,
    ) => {
      const [prescriptionsRes, productsRes, doctorsRes, agentsRes, typesRes] =
        await Promise.all([
          fetchPrescriptions({
            page,
            pageSize,
            prescription_number: prescriptionNumber || undefined,
            patient_name: patientName || undefined,
          }),
          fetchProducts({ page: 1, pageSize: 500 }),
          fetchPrescriptionDoctors(),
          fetchPrescriptionAgents(),
          fetchPrescriptionTypes(),
        ]);

      setItems(prescriptionsRes.items);
      setPagination(prescriptionsRes.pagination);
      setProducts(productsRes.items);
      setDoctors(doctorsRes);
      setAgents(agentsRes);
      setTypes(typesRes);

      if (canApprove) {
        await loadPendingApprovals();
      } else {
        setPendingApprovals([]);
      }
    },
    [
      activePatientNameSearch,
      activePrescriptionSearch,
      canApprove,
      loadPendingApprovals,
      setPendingApprovals,
    ],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadData();
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || t("prescriptions.loadFailed"));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [canApprove, loadData, setError, t]);

  const onPageChange = async (page, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      await loadData(page, pageSize, activePrescriptionSearch, activePatientNameSearch);
    } catch (err) {
      setError(err?.response?.data?.message || t("prescriptions.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const onSearchSubmit = async (e) => {
    e.preventDefault();
    const nextSearch = prescriptionSearch.trim();
    const nextPatientNameSearch = patientNameSearch.trim();
    try {
      setLoading(true);
      setError(null);
      setActivePrescriptionSearch(nextSearch);
      setActivePatientNameSearch(nextPatientNameSearch);
      await loadData(1, pagination.pageSize, nextSearch, nextPatientNameSearch);
    } catch (err) {
      setError(err?.response?.data?.message || t("prescriptions.searchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      setPrescriptionSearch("");
      setActivePrescriptionSearch("");
      setPatientNameSearch("");
      setActivePatientNameSearch("");
      await loadData(1, pagination.pageSize, "", "");
    } catch (err) {
      setError(err?.response?.data?.message || t("prescriptions.reloadFailed"));
    } finally {
      setLoading(false);
    }
  };

  return {
    items,
    products,
    doctors,
    agents,
    types,
    pagination,
    loading,
    prescriptionSearch,
    setPrescriptionSearch,
    activePrescriptionSearch,
    setActivePrescriptionSearch,
    patientNameSearch,
    setPatientNameSearch,
    activePatientNameSearch,
    setActivePatientNameSearch,
    loadData,
    onPageChange,
    onSearchSubmit,
    clearSearch,
    setLoading,
  };
};
