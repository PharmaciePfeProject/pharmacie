import { useState } from "react";
import {
  decidePrescriptionApproval,
  fetchPendingPrescriptionApprovals,
  fetchPrescriptionById,
} from "@/api/prescriptions";
import { fetchStock } from "@/api/stock";

export const usePrescriptionApprovals = ({ setError }) => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalBusyId, setApprovalBusyId] = useState(null);
  const [expandedPendingId, setExpandedPendingId] = useState(null);
  const [pendingDetailsById, setPendingDetailsById] = useState({});
  const [pendingStockById, setPendingStockById] = useState({});
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionNotesById, setRejectionNotesById] = useState({});

  const loadPendingApprovals = async () => {
    const approvalsRes = await fetchPendingPrescriptionApprovals();
    setPendingApprovals(approvalsRes);
  };

  const decideApproval = async ({ prescriptionId, decision, notes, reload }) => {
    try {
      setApprovalBusyId(prescriptionId);
      setApprovalLoading(true);
      await decidePrescriptionApproval(prescriptionId, decision, notes);
      await reload();
      setRejectingId(null);
      setRejectionNotesById((prev) => ({ ...prev, [prescriptionId]: "" }));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to update approval decision.");
    } finally {
      setApprovalBusyId(null);
      setApprovalLoading(false);
    }
  };

  const togglePendingDetails = async (prescriptionId) => {
    if (expandedPendingId === prescriptionId) {
      setExpandedPendingId(null);
      return;
    }

    setExpandedPendingId(prescriptionId);
    if (pendingDetailsById[prescriptionId]) return;

    try {
      const item = await fetchPrescriptionById(prescriptionId);
      setPendingDetailsById((prev) => ({
        ...prev,
        [prescriptionId]: item,
      }));

      const productIds = Array.from(
        new Set(
          (item?.lines || [])
            .map((line) => Number(line.product_id))
            .filter((productId) => Number.isInteger(productId) && productId > 0),
        ),
      );

      if (productIds.length > 0) {
        const stockEntries = await Promise.all(
          productIds.map(async (productId) => {
            const stockRes = await fetchStock({
              product_id: productId,
              page: 1,
              pageSize: 500,
            });
            const totalStockQty = (stockRes?.items || []).reduce(
              (sum, stockRow) => sum + Number(stockRow.quantity || 0),
              0,
            );
            return [String(productId), totalStockQty];
          }),
        );

        setPendingStockById((prev) => ({
          ...prev,
          [prescriptionId]: Object.fromEntries(stockEntries),
        }));
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load prescription details.");
    }
  };

  const onRejectClick = (prescriptionId) => {
    setRejectingId(prescriptionId);
    setRejectionNotesById((prev) => ({
      ...prev,
      [prescriptionId]: prev[prescriptionId] || "",
    }));
  };

  const submitReject = async ({ prescriptionId, reload }) => {
    const notes = (rejectionNotesById[prescriptionId] || "").trim();
    if (!notes) {
      setError("Please provide a rejection reason before rejecting.");
      return;
    }
    await decideApproval({ prescriptionId, decision: "REJECTED", notes, reload });
  };

  return {
    pendingApprovals,
    setPendingApprovals,
    approvalLoading,
    approvalBusyId,
    expandedPendingId,
    pendingDetailsById,
    pendingStockById,
    rejectingId,
    rejectionNotesById,
    setRejectionNotesById,
    setRejectingId,
    loadPendingApprovals,
    decideApproval,
    togglePendingDetails,
    onRejectClick,
    submitReject,
  };
};
