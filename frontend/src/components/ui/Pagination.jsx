import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
export function Pagination({ currentPage = 1, totalPages = 1, pageSize = 20, pageSizeOptions = [10, 20, 50], onPrevious, onNext, onPageSizeChange, className, }) {
    const { t } = useLanguage();
    return (<div className={className}>
      <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {t("pagination.page")} {currentPage} {t("pagination.of")} {totalPages}
          </p>
          {onPageSizeChange && (<label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("pagination.rows")}</span>
              <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
                {pageSizeOptions.map((option) => (<option key={option} value={option}>
                    {option}
                  </option>))}
              </select>
            </label>)}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevious} disabled={currentPage <= 1}>
            <ChevronLeft className="mr-2 h-4 w-4"/>
            {t("pagination.previous")}
          </Button>
          <Button variant="outline" size="sm" onClick={onNext} disabled={currentPage >= totalPages}>
            {t("pagination.next")}
            <ChevronRight className="ml-2 h-4 w-4"/>
          </Button>
        </div>
      </div>
    </div>);
}
