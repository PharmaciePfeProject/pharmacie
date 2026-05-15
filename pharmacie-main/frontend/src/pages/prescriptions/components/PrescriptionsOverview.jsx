export const PrescriptionsOverview = ({ t, helperCards, quickSteps }) => {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("prescriptions.workspaceTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("prescriptions.workspaceBody")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">
            {t("prescriptions.workflowTitle")}
          </p>
          <ol className="mt-3 space-y-2 text-sm text-slate-600">
            <li>1. {t("prescriptions.workflow.one")}</li>
            <li>2. {t("prescriptions.workflow.two")}</li>
            <li>3. {t("prescriptions.workflow.three")}</li>
          </ol>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {helperCards.map((card) => (
          <div
            key={card.label}
            className={
              card.tone === "blue"
                ? "rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700"
                : card.tone === "emerald"
                  ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700"
                  : "rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700"
            }
          >
            <p className="text-sm font-medium">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {t("prescriptions.quickTitle")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("prescriptions.quickSubtitle")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("prescriptions.quickHint")}
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {quickSteps.map((step, index) => (
            <div
              key={step}
              className="rounded-xl border bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t("prescriptions.quickStepLabel", { index: index + 1 })}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
