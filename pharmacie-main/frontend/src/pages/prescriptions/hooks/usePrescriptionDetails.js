import { useState } from "react";
import { fetchPrescriptionById } from "@/api/prescriptions";

export const usePrescriptionDetails = ({ setError, t }) => {
  const [expandedExistingId, setExpandedExistingId] = useState(null);
  const [existingDetailsById, setExistingDetailsById] = useState({});

  const toggleExistingDetails = async (prescriptionId) => {
    if (expandedExistingId === prescriptionId) {
      setExpandedExistingId(null);
      return;
    }

    setExpandedExistingId(prescriptionId);

    if (existingDetailsById[prescriptionId]) {
      return;
    }

    try {
      const detail = await fetchPrescriptionById(prescriptionId);
      setExistingDetailsById((prev) => ({
        ...prev,
        [prescriptionId]: detail,
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load prescription details.");
    }
  };

  return {
    expandedExistingId,
    existingDetailsById,
    toggleExistingDetails,
    setExpandedExistingId,
    setExistingDetailsById,
  };
};
