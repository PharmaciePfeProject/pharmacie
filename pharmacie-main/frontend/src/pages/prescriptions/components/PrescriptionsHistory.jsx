import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { PrescriptionDetailsRow } from "./PrescriptionDetailsRow";

export const PrescriptionsHistory = ({
  t,
  loading,
  items,
  prescriptionSearch,
  setPrescriptionSearch,
  patientNameSearch,
  setPatientNameSearch,
  onSearchSubmit,
  clearSearch,
  activePrescriptionSearch,
  onOpenExport,
  getApprovalTone,
  isDoctorUser,
  canCreate,
  startEditPrescription,
  openDeleteModal,
  expandedExistingId,
  toggleExistingDetails,
  existingDetailsById,
  setRequestExportTarget,
  pagination,
  onPageChange,
}) => {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold">{t("prescriptions.historyTitle")}</h3>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onSearchSubmit}>
        <Input
          value={prescriptionSearch}
          onChange={(e) => setPrescriptionSearch(e.target.value)}
          placeholder={t("prescriptions.searchPlaceholder")}
          className="sm:max-w-md"
        />
        <Input
          value={patientNameSearch}
          onChange={(e) => setPatientNameSearch(e.target.value)}
          placeholder="Search by patient name"
          className="sm:max-w-md"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading || items.length === 0}
            onClick={onOpenExport}
          >
            {t("prescriptions.export")}
          </Button>
          <Button type="submit" variant="outline" disabled={loading}>
            {t("prescriptions.searchAction")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={clearSearch}
            disabled={loading && !activePrescriptionSearch}
          >
            {t("common.reset")}
          </Button>
        </div>
      </form>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-4 border-0 bg-muted/20 shadow-none"
          description={t("prescriptions.noneFound")}
        />
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">{t("common.id")}</th>
                  <th className="px-4 py-3 font-semibold">{t("common.number")}</th>
                  <th className="px-4 py-3 font-semibold">{t("common.date")}</th>
                  <th className="px-4 py-3 font-semibold">{t("prescriptions.doctorColumn")}</th>
                  <th className="px-4 py-3 font-semibold">{t("prescriptions.type")}</th>
                  <th className="px-4 py-3 font-semibold">{t("prescriptions.approval")}</th>
                  <th className="px-4 py-3 font-semibold">{t("prescriptions.assignedPharmacist")}</th>
                  <th className="px-4 py-3 font-semibold">{t("prescriptions.rejectionReason")}</th>
                  <th className="px-4 py-3 font-semibold">{t("common.lines")}</th>
                  <th className="px-4 py-3 font-semibold">{t("common.actions")}</th>
                  <th className="px-4 py-3 font-semibold">{t("prescriptions.details")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <Fragment key={item.prescription_id}>
                    <tr className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.prescription_id}</td>
                      <td className="px-4 py-3 font-medium">{item.prescription_number || t("common.notAvailable")}</td>
                      <td className="px-4 py-3">{item.prescription_date ? new Date(item.prescription_date).toLocaleString() : t("common.notAvailable")}</td>
                      <td className="px-4 py-3">{item.doctor_name || item.doctor_id || t("common.notAvailable")}</td>
                      <td className="px-4 py-3">{item.type || t("common.notAvailable")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getApprovalTone(item.approval?.status || "PENDING")}`}>
                          {item.approval?.status || "PENDING"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.approval?.assigned_pharmacist_name || item.approval?.assigned_pharmacist_id || t("common.notAvailable")}</td>
                      <td className="px-4 py-3">{item.approval?.status === "REJECTED" ? item.approval?.notes || "N/A" : "-"}</td>
                      <td className="px-4 py-3">{item.lines.length}</td>
                      <td className="px-4 py-3">
                        {isDoctorUser && canCreate && item.approval?.status === "PENDING" ? (
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => startEditPrescription(item)}>
                              {t("common.edit")}
                            </Button>
                            <Button type="button" size="sm" variant="destructive" onClick={() => openDeleteModal(item)}>
                              {t("common.delete")}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => toggleExistingDetails(item.prescription_id)}>
                          {expandedExistingId === item.prescription_id ? t("prescriptions.hide") : t("prescriptions.view")}
                        </Button>
                      </td>
                    </tr>
                    {expandedExistingId === item.prescription_id ? (
                      <PrescriptionDetailsRow
                        t={t}
                        item={item}
                        details={existingDetailsById[item.prescription_id]}
                        isDoctorUser={isDoctorUser}
                        onRequestExport={setRequestExportTarget}
                      />
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              onPrevious={() => onPageChange(Math.max(1, pagination.page - 1))}
              onNext={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              onPageSizeChange={(pageSize) => onPageChange(1, pageSize)}
            />
          </div>
        </>
      )}
    </div>
  );
};
