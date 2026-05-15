import { useMemo, useState } from "react";
import { deletePrescription } from "@/api/prescriptions";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { PERMISSIONS, hasPermission } from "@/lib/roles";
import { DeletePrescriptionModal } from "./components/DeletePrescriptionModal";
import { ExportFormatModal } from "./components/ExportFormatModal";
import { PendingApprovalsPanel } from "./components/PendingApprovalsPanel";
import { PatientCard } from "./components/PatientCard";
import { PrescriptionForm } from "./components/PrescriptionForm";
import { PrescriptionsHistory } from "./components/PrescriptionsHistory";
import { PrescriptionsOverview } from "./components/PrescriptionsOverview";
import { PickerField } from "./components/PickerField";
import { usePrescriptionApprovals } from "./hooks/usePrescriptionApprovals";
import { usePrescriptionDetails } from "./hooks/usePrescriptionDetails";
import { usePrescriptionsData } from "./hooks/usePrescriptionsData";
import { usePrescriptionForm } from "./hooks/usePrescriptionForm";
import {
  buildMedicalRequestDocument,
  buildPrescriptionExportRows,
  exportMedicalRequestExcel,
  exportMedicalRequestPdf,
  exportMedicalRequestWord,
  exportPrescriptionCsv,
  exportPrescriptionPdf,
  exportPrescriptionWord,
} from "./utils/prescriptionExport";
import {
  getApprovalTone,
} from "./utils/prescriptionFormatters";
import {
  buildAgentOptions,
  buildDoctorOptions,
  buildHelperCards,
  buildQuickSteps,
  buildTypeOptions,
} from "./utils/prescriptionMappers";
const PrescriptionsPage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [requestExportTarget, setRequestExportTarget] = useState(null);
  const canCreate = useMemo(
    () => hasPermission(user, PERMISSIONS.PRESCRIPTIONS_MANAGE),
    [user],
  );
  const canApprove = useMemo(
    () => hasPermission(user, PERMISSIONS.PRESCRIPTIONS_APPROVE),
    [user],
  );
  const isDoctorUser = useMemo(
    () => Boolean(user?.roles?.includes("MEDECIN")),
    [user],
  );
  const isPharmacistUser = useMemo(
    () => Boolean(user?.roles?.includes("PHARMACIEN")),
    [user],
  );
  const {
    expandedExistingId,
    existingDetailsById,
    toggleExistingDetails,
  } = usePrescriptionDetails({ setError, t });
  const {
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
  } = usePrescriptionApprovals({ setError });
  const {
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
    patientNameSearch,
    setPatientNameSearch,
    activePatientNameSearch,
    loadData,
    onPageChange,
    onSearchSubmit,
    clearSearch,
  } = usePrescriptionsData({
    canApprove,
    loadPendingApprovals,
    setPendingApprovals,
    setError,
    t,
  });
  const {
    submitting,
    doctorId,
    setDoctorId,
    agentId,
    setAgentId,
    agentSituation,
    prescriptionNumber,
    setPrescriptionNumber,
    prescriptionType,
    setPrescriptionType,
    systemDateLabel,
    lines,
    radiosText,
    setRadiosText,
    analysesText,
    setAnalysesText,
    patientCard,
    patientCardLoading,
    editingPrescriptionId,
    isEditing,
    normalizedAgentId,
    selectedAgentName,
    agentLookupError,
    selectableDoctors,
    updateLine,
    addLine,
    removeLine,
    resetForm,
    startEditPrescription,
    getProductById,
    productOptions,
    productPlaceholder,
    productSearchPlaceholder,
    onSubmit,
  } = usePrescriptionForm({
    t,
    canCreate,
    isDoctorUser,
    doctors,
    agents,
    types,
    products,
    loadData,
    pageSize: pagination.pageSize,
    setError,
  });
  const helperCards = useMemo(
    () =>
      buildHelperCards({
        t,
        doctorsCount: selectableDoctors.length,
        productsCount: products.length,
        resultsCount: items.length,
      }),
    [items.length, products.length, selectableDoctors.length, t],
  );
  const quickSteps = useMemo(() => buildQuickSteps(t), [t]);
  const agentOptions = useMemo(
    () => buildAgentOptions({ agents, t }),
    [agents, t],
  );
  const doctorOptions = useMemo(
    () => buildDoctorOptions({ doctors: selectableDoctors, t }),
    [selectableDoctors, t],
  );
  const typeOptions = useMemo(
    () => buildTypeOptions({ types }),
    [types],
  );
  const onMedicalRequestExportFormatSelect = async (format) => {
    if (!requestExportTarget) return;
    const docData = buildMedicalRequestDocument({
      prescription: requestExportTarget.prescription,
      requestType: requestExportTarget.requestType,
      requestLabel: requestExportTarget.requestLabel,
      language,
      user,
      t,
    });

    if (format === "excel") {
      exportMedicalRequestExcel({ docData, language, t });
    }
    if (format === "word") {
      await exportMedicalRequestWord({ docData, t });
    }
    if (format === "pdf") {
      exportMedicalRequestPdf({ docData, setError, t });
    }

    setRequestExportTarget(null);
  };
  const openDeleteModal = (item) => {
    setDeleteTarget(item);
  };
  const closeDeleteModal = () => {
    if (deletingId) return;
    setDeleteTarget(null);
  };
  const confirmDeletePrescription = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.prescription_id);
      setError(null);
      await deletePrescription(deleteTarget.prescription_id);
      setDeleteTarget(null);
      if (editingPrescriptionId === deleteTarget.prescription_id) {
        resetForm();
      }
      await loadData(
        1,
        pagination.pageSize,
        activePrescriptionSearch,
        activePatientNameSearch,
      );
    } catch (err) {
      setError(err?.response?.data?.message || t("prescriptions.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };
  const onExportFormatSelect = async (format) => {
    const rows = buildPrescriptionExportRows({ items, t });
    const title = t("prescriptions.exportModalTitle");
    if (format === "excel") exportPrescriptionCsv({ rows });
    if (format === "word") await exportPrescriptionWord({ rows, title });
    if (format === "pdf") exportPrescriptionPdf({ rows, title });
    setExportModalOpen(false);
  };
  const reloadCurrentPage = async () => {
    await loadData(
      pagination.page,
      pagination.pageSize,
      activePrescriptionSearch,
      activePatientNameSearch,
    );
  };
  const decideApprovalHandler = async (prescriptionId, decision, notes) => {
    await decideApproval({
      prescriptionId,
      decision,
      notes,
      reload: reloadCurrentPage,
    });
  };
  const submitRejectHandler = async (prescriptionId) => {
    await submitReject({
      prescriptionId,
      reload: reloadCurrentPage,
    });
  };
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <PrescriptionsOverview
          t={t}
          helperCards={helperCards}
          quickSteps={quickSteps}
        />

        <PatientCard
          t={t}
          normalizedAgentId={normalizedAgentId}
          selectedAgentName={selectedAgentName}
          agentId={agentId}
          patientCardLoading={patientCardLoading}
          patientCard={patientCard}
        />

        {!isEditing ? (
          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <PrescriptionForm
              t={t}
              onSubmit={onSubmit}
              canCreate={canCreate}
              isEditing={isEditing}
              submitting={submitting}
              isDoctorUser={isDoctorUser}
              selectableDoctors={selectableDoctors}
              agentId={agentId}
              setAgentId={setAgentId}
              agentOptions={agentOptions}
              agentLookupError={agentLookupError}
              agentSituation={agentSituation}
              prescriptionNumber={prescriptionNumber}
              setPrescriptionNumber={setPrescriptionNumber}
              prescriptionType={prescriptionType}
              setPrescriptionType={setPrescriptionType}
              typeOptions={typeOptions}
              systemDateLabel={systemDateLabel}
              doctorId={doctorId}
              setDoctorId={setDoctorId}
              doctorOptions={doctorOptions}
              PickerField={PickerField}
              lines={lines}
              addLine={addLine}
              updateLine={updateLine}
              removeLine={removeLine}
              productOptions={productOptions}
              productPlaceholder={productPlaceholder}
              productSearchPlaceholder={productSearchPlaceholder}
              getProductById={getProductById}
              radiosText={radiosText}
              setRadiosText={setRadiosText}
              analysesText={analysesText}
              setAnalysesText={setAnalysesText}
              resetForm={resetForm}
              error={error}
            />
          </form>
        ) : null}

        {error && (
          <p className="mt-4 whitespace-pre-line text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <PrescriptionsHistory
        t={t}
        loading={loading}
        items={items}
        prescriptionSearch={prescriptionSearch}
        setPrescriptionSearch={setPrescriptionSearch}
        patientNameSearch={patientNameSearch}
        setPatientNameSearch={setPatientNameSearch}
        onSearchSubmit={onSearchSubmit}
        clearSearch={clearSearch}
        activePrescriptionSearch={activePrescriptionSearch}
        onOpenExport={() => setExportModalOpen(true)}
        getApprovalTone={getApprovalTone}
        isDoctorUser={isDoctorUser}
        canCreate={canCreate}
        startEditPrescription={startEditPrescription}
        openDeleteModal={openDeleteModal}
        expandedExistingId={expandedExistingId}
        toggleExistingDetails={toggleExistingDetails}
        existingDetailsById={existingDetailsById}
        setRequestExportTarget={setRequestExportTarget}
        pagination={pagination}
        onPageChange={onPageChange}
      />
      {canApprove && isPharmacistUser ? (
        <PendingApprovalsPanel
          t={t}
          pendingApprovals={pendingApprovals}
          approvalLoading={approvalLoading}
          approvalBusyId={approvalBusyId}
          expandedPendingId={expandedPendingId}
          togglePendingDetails={togglePendingDetails}
          decideApproval={decideApprovalHandler}
          onRejectClick={onRejectClick}
          pendingDetailsById={pendingDetailsById}
          pendingStockById={pendingStockById}
          rejectingId={rejectingId}
          rejectionNotesById={rejectionNotesById}
          setRejectionNotesById={setRejectionNotesById}
          setRejectingId={setRejectingId}
          submitReject={submitRejectHandler}
        />
      ) : null}

      {isEditing ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-white shadow-xl">
            <div className="border-b px-5 py-4">
              <h3 className="text-lg font-semibold">
                {t("prescriptions.editingNow")} #{editingPrescriptionId}
              </h3>
            </div>
            <form
              className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4"
              onSubmit={onSubmit}
            >
              <PrescriptionForm
                t={t}
                onSubmit={onSubmit}
                canCreate={canCreate}
                isEditing={isEditing}
                submitting={submitting}
                isDoctorUser={isDoctorUser}
                selectableDoctors={selectableDoctors}
                agentId={agentId}
                setAgentId={setAgentId}
                agentOptions={agentOptions}
                agentLookupError={agentLookupError}
                agentSituation={agentSituation}
                prescriptionNumber={prescriptionNumber}
                setPrescriptionNumber={setPrescriptionNumber}
                prescriptionType={prescriptionType}
                setPrescriptionType={setPrescriptionType}
                typeOptions={typeOptions}
                systemDateLabel={systemDateLabel}
                doctorId={doctorId}
                setDoctorId={setDoctorId}
                doctorOptions={doctorOptions}
                PickerField={PickerField}
                lines={lines}
                addLine={addLine}
                updateLine={updateLine}
                removeLine={removeLine}
                productOptions={productOptions}
                productPlaceholder={productPlaceholder}
                productSearchPlaceholder={productSearchPlaceholder}
                getProductById={getProductById}
                radiosText={radiosText}
                setRadiosText={setRadiosText}
                analysesText={analysesText}
                setAnalysesText={setAnalysesText}
                resetForm={resetForm}
                error={error}
                inModal
              />
            </form>
          </div>
        </div>
      ) : null}

      <ExportFormatModal
        open={exportModalOpen}
        title={t("prescriptions.exportModalTitle")}
        body={t("prescriptions.exportModalBody")}
        onClose={() => setExportModalOpen(false)}
        onSelect={onExportFormatSelect}
      />

      <ExportFormatModal
        open={Boolean(requestExportTarget)}
        title={t("prescriptions.exportModalTitle")}
        body={
          requestExportTarget
            ? `${requestExportTarget.requestType === "RADIO"
                ? t("prescriptions.print.requestedExam")
                : t("prescriptions.print.requestedAnalysis")
              }: ${requestExportTarget.requestLabel}`
            : ""
        }
        onClose={() => setRequestExportTarget(null)}
        onSelect={onMedicalRequestExportFormatSelect}
      />

      <DeletePrescriptionModal
        open={Boolean(deleteTarget)}
        t={t}
        deleteTarget={deleteTarget || {}}
        deletingId={deletingId}
        onClose={closeDeleteModal}
        onConfirm={confirmDeletePrescription}
      />
    </div>
  );
};

export default PrescriptionsPage;


