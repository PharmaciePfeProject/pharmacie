import { Button } from "@/components/ui/button";

export const DeletePrescriptionModal = ({
  open,
  t,
  deleteTarget,
  deletingId,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold">{t("prescriptions.deleteModalTitle")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("prescriptions.deleteModalBody")}
        </p>
        <p className="mt-2 text-sm">
          <span className="font-medium">{t("prescriptions.number")}:</span>{" "}
          {deleteTarget.prescription_number || deleteTarget.prescription_id}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={Boolean(deletingId)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={Boolean(deletingId)}
          >
            {deletingId ? t("prescriptions.deleting") : t("common.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
};
