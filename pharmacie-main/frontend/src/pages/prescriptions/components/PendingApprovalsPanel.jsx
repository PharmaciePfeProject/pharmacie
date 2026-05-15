import { Fragment } from "react";
import { Button } from "@/components/ui/button";

export const PendingApprovalsPanel = ({
  t,
  pendingApprovals,
  approvalLoading,
  approvalBusyId,
  expandedPendingId,
  togglePendingDetails,
  decideApproval,
  onRejectClick,
  pendingDetailsById,
  pendingStockById,
  rejectingId,
  rejectionNotesById,
  setRejectionNotesById,
  setRejectingId,
  submitReject,
}) => {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{t("prescriptions.pendingApprovals")}</h3>
        <p className="text-sm text-muted-foreground">
          {pendingApprovals.length} {t("prescriptions.pending")}
        </p>
      </div>

      {approvalLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("prescriptions.updatingApproval")}</p>
      ) : pendingApprovals.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("prescriptions.noPendingApprovals")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full table-auto border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold">{t("prescriptions.prescriptionColumn")}</th>
                <th className="px-3 py-2 font-semibold">{t("prescriptions.doctorColumn")}</th>
                <th className="px-3 py-2 font-semibold">{t("prescriptions.agentColumn")}</th>
                <th className="px-3 py-2 font-semibold">{t("prescriptions.requested")}</th>
                <th className="px-3 py-2 font-semibold">Lines</th>
                <th className="px-3 py-2 font-semibold">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.map((entry) => (
                <Fragment key={entry.prescription_id}>
                  <tr className="border-t">
                    <td className="px-3 py-2">{entry.prescription_number || entry.prescription_id}</td>
                    <td className="px-3 py-2">{entry.doctor_name || entry.doctor_id || "N/A"}</td>
                    <td className="px-3 py-2">{entry.agent_id || "N/A"}</td>
                    <td className="px-3 py-2">{entry.requested_at ? new Date(entry.requested_at).toLocaleString() : "N/A"}</td>
                    <td className="px-3 py-2">{entry.line_count || 0}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={approvalBusyId === entry.prescription_id}
                          onClick={() => togglePendingDetails(entry.prescription_id)}
                        >
                          {expandedPendingId === entry.prescription_id ? t("prescriptions.hideDetails") : t("prescriptions.viewDetails")}
                        </Button>
                        <Button
                          size="sm"
                          disabled={approvalBusyId === entry.prescription_id}
                          onClick={() => decideApproval(entry.prescription_id, "APPROVED")}
                        >
                          {t("prescriptions.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={approvalBusyId === entry.prescription_id}
                          onClick={() => onRejectClick(entry.prescription_id)}
                        >
                          {t("prescriptions.reject")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedPendingId === entry.prescription_id ? (
                    <tr className="border-t bg-slate-50/70">
                      <td colSpan={6} className="px-3 py-3">
                        {pendingDetailsById[entry.prescription_id] ? (
                          <div className="space-y-3">
                            <div className="grid gap-2 text-sm sm:grid-cols-3">
                              <div><span className="font-semibold">{t("prescriptions.doctor")}: </span>{pendingDetailsById[entry.prescription_id].doctor_name || pendingDetailsById[entry.prescription_id].doctor_id || "N/A"}</div>
                              <div><span className="font-semibold">{t("prescriptions.agentId")}: </span>{pendingDetailsById[entry.prescription_id].agent_id || "N/A"}</div>
                              <div><span className="font-semibold">{t("prescriptions.type")}: </span>{pendingDetailsById[entry.prescription_id].type || "N/A"}</div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-100">
                                  <tr>
                                    <th className="px-2 py-2 text-left">{t("common.product")}</th>
                                    <th className="px-2 py-2 text-left">{t("prescriptions.requestedQty")}</th>
                                    <th className="px-2 py-2 text-left">{t("prescriptions.stockQty")}</th>
                                    <th className="px-2 py-2 text-left">{t("prescriptions.comparison")}</th>
                                    <th className="px-2 py-2 text-left">{t("prescriptions.days")}</th>
                                    <th className="px-2 py-2 text-left">{t("prescriptions.posologie")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pendingDetailsById[entry.prescription_id].lines.map((line) => {
                                    const requestedQty = Number(line.total_qt || 0);
                                    const stockQtyRaw = pendingStockById[entry.prescription_id]?.[String(line.product_id)];
                                    const stockQty = stockQtyRaw === undefined ? null : Number(stockQtyRaw || 0);
                                    const hasEnoughStock = stockQty !== null && stockQty >= requestedQty;

                                    return (
                                      <tr key={line.line_id} className="border-t">
                                        <td className="px-2 py-2">
                                          <div className="font-medium text-slate-900">{line.product_lib || "-"}</div>
                                          <div className="text-xs text-slate-500">{t("common.id")}: {line.product_id ?? "-"}</div>
                                        </td>
                                        <td className="px-2 py-2">{line.total_qt}</td>
                                        <td className="px-2 py-2">{stockQty === null ? "..." : stockQty}</td>
                                        <td className="px-2 py-2">
                                          {stockQty === null ? (
                                            <span className="text-xs text-muted-foreground">{t("prescriptions.checking")}</span>
                                          ) : hasEnoughStock ? (
                                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{t("prescriptions.enough")}</span>
                                          ) : (
                                            <span className="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">{t("prescriptions.insufficient")}</span>
                                          )}
                                        </td>
                                        <td className="px-2 py-2">{line.days ?? "-"}</td>
                                        <td className="px-2 py-2">{line.posologie || "-"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{t("prescriptions.loadingDetails")}</p>
                        )}
                      </td>
                    </tr>
                  ) : null}
                  {rejectingId === entry.prescription_id ? (
                    <tr className="border-t bg-rose-50/40">
                      <td colSpan={6} className="px-3 py-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-rose-700">{t("prescriptions.reasonForRejection")}</p>
                          <textarea
                            rows={3}
                            className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary"
                            value={rejectionNotesById[entry.prescription_id] || ""}
                            onChange={(event) =>
                              setRejectionNotesById((prev) => ({
                                ...prev,
                                [entry.prescription_id]: event.target.value,
                              }))
                            }
                            placeholder={t("prescriptions.rejectPlaceholder")}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>
                              {t("common.cancel")}
                            </Button>
                            <Button size="sm" disabled={approvalBusyId === entry.prescription_id} onClick={() => submitReject(entry.prescription_id)}>
                              {t("prescriptions.confirmRejection")}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
