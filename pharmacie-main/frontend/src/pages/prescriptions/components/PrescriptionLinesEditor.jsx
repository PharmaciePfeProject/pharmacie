import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const PrescriptionLinesEditor = ({
  t,
  lines,
  addLine,
  updateLine,
  removeLine,
  productOptions,
  productPlaceholder,
  productSearchPlaceholder,
  PickerField,
  getProductById,
  showProductHint = true,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{t("prescriptions.lines")}</p>
        <Button type="button" variant="outline" onClick={addLine}>
          {t("prescriptions.addLine")}
        </Button>
      </div>

      {lines.map((line, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-3 rounded-lg border p-3 md:grid-cols-2 lg:grid-cols-12"
        >
          <div className="space-y-2 lg:col-span-3">
            <PickerField
              value={line.product_id}
              onChange={(value) => updateLine(index, "product_id", value)}
              options={productOptions.map((option) => ({
                ...option,
                displayLabel: option.label,
                displayMeta: option.value,
              }))}
              placeholder={productPlaceholder}
              searchPlaceholder={productSearchPlaceholder}
              compact
            />
            {showProductHint ? (
              <p className="text-xs text-muted-foreground">
                {line.product_id.trim()
                  ? getProductById(line.product_id)?.lib ||
                    t("prescriptions.unknownProduct")
                  : t("prescriptions.productHint")}
              </p>
            ) : null}
          </div>

          <Input
            type="number"
            step="0.001"
            className="h-10 lg:col-span-1"
            value={line.total_qt}
            onChange={(e) => updateLine(index, "total_qt", e.target.value)}
            placeholder={t("common.quantity")}
          />
          <Input
            type="number"
            className="h-10 lg:col-span-1"
            value={line.days}
            onChange={(e) => updateLine(index, "days", e.target.value)}
            placeholder={t("prescriptions.days")}
          />
          <Input
            type="number"
            className="h-10 lg:col-span-1"
            value={line.dist_number}
            onChange={(e) =>
              updateLine(index, "dist_number", e.target.value)
            }
            placeholder={t("prescriptions.distributionCount")}
          />

          <select
            className="h-10 rounded-xl border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary lg:col-span-2"
            value={line.is_periodic}
            onChange={(e) => updateLine(index, "is_periodic", e.target.value)}
          >
            <option value="0">{t("prescriptions.nonPeriodic")}</option>
            <option value="1">{t("prescriptions.periodic")}</option>
          </select>

          <Input
            className="h-10 lg:col-span-2"
            value={line.periodicity}
            onChange={(e) => updateLine(index, "periodicity", e.target.value)}
            placeholder={t("prescriptions.periodicity")}
          />
          <div className="flex gap-2 lg:col-span-2">
            <Input
              className="h-10"
              value={line.posologie}
              onChange={(e) => updateLine(index, "posologie", e.target.value)}
              placeholder={t("prescriptions.posologie")}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => removeLine(index)}
              disabled={lines.length === 1}
            >
              X
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
