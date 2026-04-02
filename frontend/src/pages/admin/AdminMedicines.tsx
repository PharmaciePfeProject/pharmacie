import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createProduct, fetchProductById, fetchProducts, updateProduct } from "@/api/products";
import { fetchDci, fetchPharmaClasses, fetchProductTypes } from "@/api/references";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PickerField, type PickerOption } from "@/components/ui/PickerField";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Product } from "@/pages/products/product.types";
import type { DciReference, PharmaClass, ProductTypeReference } from "@/types/references";

type ProductForm = {
  lib: string;
  bar_code: string;
  dci: string;
  price: string;
  vat_rate: string;
  wau_cost: string;
  min_stock: string;
  safety_stock: string;
  warning_stock: string;
  pharma_class_id: string;
  type_id: string;
};

const initialForm: ProductForm = {
  lib: "",
  bar_code: "",
  dci: "",
  price: "0",
  vat_rate: "0",
  wau_cost: "0",
  min_stock: "0",
  safety_stock: "0",
  warning_stock: "0",
  pharma_class_id: "",
  type_id: "",
};

function formatDecimal(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(3) : "-";
}

export default function AdminMedicines() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [dciOptions, setDciOptions] = useState<DciReference[]>([]);
  const [pharmaClasses, setPharmaClasses] = useState<PharmaClass[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeReference[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.lib.trim() &&
        form.bar_code.trim() &&
        form.dci.trim() &&
        form.pharma_class_id &&
        form.type_id
    );
  }, [form]);

  const dciPickerOptions = useMemo<PickerOption[]>(
    () =>
      dciOptions.map((item) => ({
        value: String(item.dci_id),
        label: item.label || "-",
      })),
    [dciOptions]
  );

  const pharmaClassOptions = useMemo<PickerOption[]>(
    () =>
      pharmaClasses.map((item) => ({
        value: String(item.pharma_class_id),
        label: item.label || "-",
      })),
    [pharmaClasses]
  );

  const productTypeOptions = useMemo<PickerOption[]>(
    () =>
      productTypes.map((item) => ({
        value: String(item.product_type_id),
        label: item.label || "-",
      })),
    [productTypes]
  );

  const selectedDciValue = useMemo(() => {
    const match = dciOptions.find((item) => (item.label || "") === form.dci);
    return match ? String(match.dci_id) : "";
  }, [dciOptions, form.dci]);

  const loadData = async () => {
    const [productsRes, dciRes, classesRes, typesRes] = await Promise.all([
      fetchProducts({ page: 1, pageSize: 20 }),
      fetchDci(),
      fetchPharmaClasses(),
      fetchProductTypes(),
    ]);

    setProducts(productsRes.items);
    setDciOptions(dciRes);
    setPharmaClasses(classesRes);
    setProductTypes(typesRes);
  };

  const loadProductIntoForm = async (productId: number) => {
    const product = await fetchProductById(productId);
    setEditingProductId(productId);
    setForm({
      lib: product.lib || "",
      bar_code: product.bar_code || "",
      dci: product.dci || "",
      price: String(product.price ?? 0),
      vat_rate: String(product.vat_rate ?? 0),
      wau_cost: String(product.wau_cost ?? 0),
      min_stock: String(product.min_stock ?? 0),
      safety_stock: String(product.safety_stock ?? 0),
      warning_stock: String(product.warning_stock ?? 0),
      pharma_class_id: product.pharma_class_id ? String(product.pharma_class_id) : "",
      type_id: product.type_id ? String(product.type_id) : "",
    });
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoadingProducts(true);
        await loadData();
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || t("adminMedicines.loadFailed"));
        }
      } finally {
        if (active) setLoadingProducts(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    const productIdParam = searchParams.get("productId");
    const productId = productIdParam ? Number(productIdParam) : null;

    if (!productId || !Number.isInteger(productId) || productId <= 0) {
      setEditingProductId(null);
      return;
    }

    let active = true;

    (async () => {
      try {
        setError(null);
        await loadProductIntoForm(productId);
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || t("adminMedicines.loadEditFailed"));
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [searchParams, t]);

  const updateField = (field: keyof ProductForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        lib: form.lib.trim(),
        bar_code: form.bar_code.trim(),
        dci: form.dci.trim(),
        price: Number(form.price),
        vat_rate: Number(form.vat_rate),
        wau_cost: Number(form.wau_cost),
        min_stock: Number(form.min_stock),
        safety_stock: Number(form.safety_stock),
        warning_stock: Number(form.warning_stock),
        pharma_class_id: Number(form.pharma_class_id),
        type_id: Number(form.type_id),
      };

      if (editingProductId) {
        await updateProduct(editingProductId, payload);
        setSuccess(t("adminMedicines.updated"));
      } else {
        await createProduct(payload);
        setSuccess(t("adminMedicines.created"));
      }

      setForm(initialForm);
      setEditingProductId(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("productId");
        return next;
      });
      const productsRes = await fetchProducts({ page: 1, pageSize: 20 });
      setProducts(productsRes.items);
    } catch (err: any) {
      setError(err?.response?.data?.message || (editingProductId ? t("adminMedicines.updateFailed") : t("adminMedicines.createFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{editingProductId ? t("adminMedicines.editTitle") : t("adminMedicines.addTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("adminMedicines.subtitle")}
            </p>
          </div>
          {editingProductId ? (
            <Link to="/app/admin/medicines">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setEditingProductId(null);
                  setForm(initialForm);
                  setSearchParams(new URLSearchParams());
                }}
              >
                {t("adminMedicines.cancelEditing")}
              </Button>
            </Link>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("products.label")}</p>
            <Input value={form.lib} onChange={(e) => updateField("lib", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.barcode")}</p>
            <Input value={form.bar_code} onChange={(e) => updateField("bar_code", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">DCI</p>
            <PickerField
              value={selectedDciValue}
              onChange={(value) => {
                const selected = dciOptions.find((item) => String(item.dci_id) === value);
                updateField("dci", selected?.label || "");
              }}
              options={dciPickerOptions}
              placeholder={t("adminMedicines.select")}
              searchPlaceholder={t("adminMedicines.searchDci")}
              emptyText={t("adminMedicines.noOption")}
              helperText={t("adminMedicines.dciHelp")}
              compact
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("products.price")}</p>
            <Input type="number" step="0.001" value={form.price} onChange={(e) => updateField("price", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("adminMedicines.vat")}</p>
            <Input type="number" step="0.001" value={form.vat_rate} onChange={(e) => updateField("vat_rate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("products.wauCost")}</p>
            <Input type="number" step="0.001" value={form.wau_cost} onChange={(e) => updateField("wau_cost", e.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("adminMedicines.minStock")}</p>
            <Input type="number" value={form.min_stock} onChange={(e) => updateField("min_stock", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("adminMedicines.safetyStock")}</p>
            <Input type="number" value={form.safety_stock} onChange={(e) => updateField("safety_stock", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("products.warningStock")}</p>
            <Input type="number" value={form.warning_stock} onChange={(e) => updateField("warning_stock", e.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("adminMedicines.pharmaClass")}</p>
            <PickerField
              value={form.pharma_class_id}
              onChange={(value) => updateField("pharma_class_id", value)}
              options={pharmaClassOptions}
              placeholder={t("adminMedicines.select")}
              searchPlaceholder={t("adminMedicines.searchPharmaClass")}
              emptyText={t("adminMedicines.noOption")}
              helperText={t("adminMedicines.pharmaClassHelp")}
              compact
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("adminMedicines.productType")}</p>
            <PickerField
              value={form.type_id}
              onChange={(value) => updateField("type_id", value)}
              options={productTypeOptions}
              placeholder={t("adminMedicines.select")}
              searchPlaceholder={t("adminMedicines.searchProductType")}
              emptyText={t("adminMedicines.noOption")}
              helperText={t("adminMedicines.productTypeHelp")}
              compact
            />
          </div>

          <div className="col-span-1 flex items-end md:col-span-2 lg:col-span-1">
            <Button type="submit" disabled={!canSubmit || submitting} className="w-full rounded-xl">
              {submitting ? (editingProductId ? t("adminMedicines.updating") : t("adminMedicines.adding")) : (editingProductId ? t("adminMedicines.updateAction") : t("adminMedicines.addAction"))}
            </Button>
          </div>
        </form>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {success && <p className="mt-4 text-sm text-emerald-700">{success}</p>}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">{t("adminMedicines.latest")}</h3>
        {loadingProducts ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">{t("products.label")}</th>
                  <th className="px-3 py-2">{t("common.barcode")}</th>
                  <th className="px-3 py-2">DCI</th>
                  <th className="px-3 py-2">{t("products.price")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => (
                  <tr key={item.product_id} className="border-t">
                    <td className="px-3 py-2">{item.product_id}</td>
                    <td className="px-3 py-2">{item.lib || "-"}</td>
                    <td className="px-3 py-2">{item.bar_code || "-"}</td>
                    <td className="px-3 py-2">{item.dci || "-"}</td>
                    <td className="px-3 py-2">{formatDecimal(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
