import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

export const ExportFormatModal = ({
  open,
  title,
  body,
  onClose,
  onSelect,
}) => {
  const { t } = useLanguage();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-xl">
        <h3 className="text-xl font-semibold">{title}</h3>
        {body ? <p className="mt-2 text-sm text-muted-foreground">{body}</p> : null}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            type="button"
            className="border border-red-200 bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300"
            onClick={() => onSelect("pdf")}
          >
            PDF
          </Button>
          <Button
            type="button"
            className="border border-blue-200 bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-300"
            onClick={() => onSelect("word")}
          >
            Word
          </Button>
          <Button
            type="button"
            className="border border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-300"
            onClick={() => onSelect("excel")}
          >
            Excel
          </Button>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
};
