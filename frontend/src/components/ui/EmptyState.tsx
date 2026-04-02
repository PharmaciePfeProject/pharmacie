import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

type EmptyStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function EmptyState({
  title,
  description,
  className,
}: EmptyStateProps) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center shadow-sm",
        className
      )}
      >
      <div className="mb-4 rounded-full bg-muted p-3 text-muted-foreground">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title || t("empty.title")}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description || t("empty.description")}</p>
    </div>
  );
}
