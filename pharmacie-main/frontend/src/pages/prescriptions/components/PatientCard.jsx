export const PatientCard = ({
  t,
  normalizedAgentId,
  selectedAgentName,
  agentId,
  patientCardLoading,
  patientCard,
}) => {
  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">
          {t("prescriptions.patientCardTitle")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("prescriptions.agentId")}: {selectedAgentName}{" "}
          {agentId ? `(${t("common.id")}: ${agentId})` : ""}
        </p>
      </div>

      {!normalizedAgentId ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("prescriptions.selectAgentForHistory")}
        </p>
      ) : patientCardLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("prescriptions.loadingPatientHistory")}
        </p>
      ) : !patientCard ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("prescriptions.noPatientHistory")}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-muted-foreground">
                {t("prescriptions.totalPrescriptions")}
              </p>
              <p className="text-lg font-semibold">
                {patientCard.total_prescriptions || 0}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-muted-foreground">
                {t("prescriptions.lastPrescriptionNumber")}
              </p>
              <p className="text-sm font-medium">
                {patientCard.last_prescription_number || "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-muted-foreground">
                {t("prescriptions.latestSituation")}
              </p>
              <p className="text-sm font-medium">
                {patientCard.agent_situation || "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-muted-foreground">
                {t("prescriptions.lastPrescriptionDate")}
              </p>
              <p className="text-sm font-medium">
                {patientCard.last_prescription_date
                  ? new Date(
                      patientCard.last_prescription_date,
                    ).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("prescriptions.recentHistory")}
            </p>
            <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              {patientCard.history?.length ? (
                <ul className="divide-y divide-slate-100">
                  {patientCard.history.slice(0, 8).map((entry) => (
                    <li
                      key={entry.prescription_id}
                      className="px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-900">
                        #
                        {entry.prescription_number || entry.prescription_id}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {entry.type || "Type N/A"}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {entry.prescription_date
                          ? new Date(
                              entry.prescription_date,
                            ).toLocaleDateString()
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  {t("prescriptions.noPreviousPrescription")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
