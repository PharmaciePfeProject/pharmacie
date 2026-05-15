import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrescriptionLinesEditor } from "./PrescriptionLinesEditor";

export const PrescriptionForm = ({
  t,
  onSubmit,
  canCreate,
  isEditing,
  submitting,
  isDoctorUser,
  selectableDoctors,
  agentId,
  setAgentId,
  agentOptions,
  agentLookupError,
  agentSituation,
  prescriptionNumber,
  setPrescriptionNumber,
  prescriptionType,
  setPrescriptionType,
  typeOptions,
  systemDateLabel,
  doctorId,
  setDoctorId,
  doctorOptions,
  PickerField,
  lines,
  addLine,
  updateLine,
  removeLine,
  productOptions,
  productPlaceholder,
  productSearchPlaceholder,
  getProductById,
  radiosText,
  setRadiosText,
  analysesText,
  setAnalysesText,
  resetForm,
  error,
  inModal = false,
}) => {
  if (!canCreate) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        {t("prescriptions.authorizedOnly")}
      </p>
    );
  }

  const formBody = (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("prescriptions.agentNameId")}</p>
          <PickerField
            value={agentId}
            onChange={setAgentId}
            options={agentOptions}
            placeholder={t("prescriptions.agentPlaceholder")}
            searchPlaceholder={t("prescriptions.agentPlaceholder")}
            compact
          />
          {!inModal ? (
            <p className="text-xs text-muted-foreground">
              {t("prescriptions.agentHint")}
            </p>
          ) : null}
          {agentLookupError ? (
            <p className="text-xs text-destructive">{agentLookupError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("prescriptions.agentSituation")}</p>
          <Input value={agentSituation} readOnly />
          {!inModal ? (
            <p className="text-xs text-muted-foreground">
              {t("prescriptions.agentSituationHint")}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("prescriptions.number")}</p>
          <Input
            value={prescriptionNumber}
            onChange={(e) => setPrescriptionNumber(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("prescriptions.type")}</p>
          <PickerField
            value={prescriptionType}
            onChange={setPrescriptionType}
            options={typeOptions}
            placeholder={t("prescriptions.selectType")}
            searchPlaceholder={t("prescriptions.selectType")}
            compact
          />
        </div>

        {!inModal ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.date")}</p>
            <Input value={systemDateLabel} readOnly />
            <p className="text-xs text-muted-foreground">
              {t("prescriptions.dateHint")}
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("prescriptions.doctor")}</p>
          <PickerField
            value={doctorId}
            onChange={setDoctorId}
            options={doctorOptions}
            disabled={isDoctorUser}
            placeholder={
              isDoctorUser
                ? t("prescriptions.connectedDoctor")
                : t("prescriptions.selectDoctor")
            }
            searchPlaceholder={t("prescriptions.selectDoctor")}
            compact
          />
          {!inModal && isDoctorUser && selectableDoctors.length === 0 ? (
            <p className="text-xs text-destructive">
              {t("prescriptions.noDoctorProfile")}
            </p>
          ) : null}
        </div>
      </div>

      <PrescriptionLinesEditor
        t={t}
        lines={lines}
        addLine={addLine}
        updateLine={updateLine}
        removeLine={removeLine}
        productOptions={productOptions}
        productPlaceholder={productPlaceholder}
        productSearchPlaceholder={productSearchPlaceholder}
        PickerField={PickerField}
        getProductById={getProductById}
        showProductHint={!inModal}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("prescriptions.radiosToPerform")}</p>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary"
            value={radiosText}
            onChange={(event) => setRadiosText(event.target.value)}
            placeholder="One radio exam per line, or separated by commas"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t("prescriptions.analysesToPerform")}
          </p>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary"
            value={analysesText}
            onChange={(event) => setAnalysesText(event.target.value)}
            placeholder="One analysis per line, or separated by commas"
          />
        </div>
      </div>
    </>
  );

  if (inModal) {
    return (
      <>
        {formBody}
        {error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={submitting}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("prescriptions.updating") : t("prescriptions.update")}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      {formBody}
      <Button type="submit" disabled={submitting}>
        {submitting
          ? isEditing
            ? t("prescriptions.updating")
            : t("prescriptions.creating")
          : isEditing
            ? t("prescriptions.update")
            : t("prescriptions.create")}
      </Button>
      {isEditing ? (
        <Button
          type="button"
          variant="outline"
          onClick={resetForm}
          disabled={submitting}
        >
          {t("common.cancel")}
        </Button>
      ) : null}
    </>
  );
};
