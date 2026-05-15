import { Button } from "@/components/ui/button";

export const PrescriptionDetailsRow = ({
  t,
  item,
  details,
  isDoctorUser,
  onRequestExport,
}) => {
  return (
    <tr className="border-t bg-slate-50/60">
      <td className="px-4 py-3" colSpan={11}>
        {!details ? (
          <p className="text-sm text-muted-foreground">
            {t("prescriptions.loadingDetails")}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="font-semibold">
                  {t("prescriptions.print.prescriptionNumber")}
                  :
                </span>{" "}
                {details.prescription_number || details.prescription_id}
              </div>
              <div>
                <span className="font-semibold">
                  {t("prescriptions.patientName")}:
                </span>{" "}
                {details.agent_name || details.agent_situation || "N/A"}
              </div>
            </div>

            {details.approval?.status === "REJECTED" ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <p className="font-semibold">{t("prescriptions.reasonOfRefusal")}</p>
                <p className="mt-1">
                  {details.approval?.notes || t("prescriptions.noReasonProvided")}
                </p>
              </div>
            ) : null}

            <div className="rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-2 py-2 text-left">{t("common.product")}</th>
                    <th className="px-2 py-2 text-left">{t("prescriptions.qty")}</th>
                    <th className="px-2 py-2 text-left">{t("prescriptions.days")}</th>
                    <th className="px-2 py-2 text-left">{t("prescriptions.periodicity")}</th>
                    <th className="px-2 py-2 text-left">{t("prescriptions.posologie")}</th>
                  </tr>
                </thead>
                <tbody>
                  {details.lines.map((line) => (
                    <tr key={line.line_id} className="border-t">
                      <td className="px-2 py-2">
                        <div className="font-medium text-slate-900">{line.product_lib || "-"}</div>
                        <div className="text-xs text-slate-500">{t("common.id")}: {line.product_id ?? "-"}</div>
                      </td>
                      <td className="px-2 py-2">{line.total_qt}</td>
                      <td className="px-2 py-2">{line.days ?? "-"}</td>
                      <td className="px-2 py-2">{line.periodicity || "-"}</td>
                      <td className="px-2 py-2">{line.posologie || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("prescriptions.radios")}
                </p>
                {details.radios?.length ? (
                  <div className="mt-2 space-y-2">
                    {details.radios.map((radio, index) => (
                      <div
                        key={`${item.prescription_id}-radio-${index}`}
                        className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="text-sm font-medium text-slate-800">{radio}</div>
                        {isDoctorUser ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onRequestExport({
                                prescription: details,
                                requestType: "RADIO",
                                requestLabel: radio,
                              })
                            }
                          >
                            {t("prescriptions.export")}
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">{t("prescriptions.noRadios")}</p>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("prescriptions.analyses")}
                </p>
                {details.analyses?.length ? (
                  <div className="mt-2 space-y-2">
                    {details.analyses.map((analysis, index) => (
                      <div
                        key={`${item.prescription_id}-analysis-${index}`}
                        className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="text-sm font-medium text-slate-800">{analysis}</div>
                        {isDoctorUser ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onRequestExport({
                                prescription: details,
                                requestType: "ANALYSIS",
                                requestLabel: analysis,
                              })
                            }
                          >
                            {t("prescriptions.export")}
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">{t("prescriptions.noAnalyses")}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
};
