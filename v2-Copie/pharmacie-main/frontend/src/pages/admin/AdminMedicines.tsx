import { useEffect, useMemo, useState } from "react";
import { createProduct, fetchProducts } from "@/api/products";
import { fetchDci, fetchPharmaClasses, fetchProductTypes } from "@/api/references";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [dciOptions, setDciOptions] = useState<DciReference[]>([]);
  const [pharmaClasses, setPharmaClasses] = useState<PharmaClass[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeReference[]>([]);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.lib.trim() &&
        form.bar_code.trim() &&
        form.dci.trim() &&
        form.pharma_class_id &&
        form.type_id
    );
  }, [form]);

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

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoadingProducts(true);
        await loadData();
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load medicines data.");
        }
      } finally {
        if (active) setLoadingProducts(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

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
      await createProduct({
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
      });

      setSuccess("Medicine added successfully.");
      setForm(initialForm);
      const productsRes = await fetchProducts({ page: 1, pageSize: 20 });
      setProducts(productsRes.items);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to add medicine.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Add a medicine</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This admin form uses the existing PRODUCT fields.
        </p>

        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Label</p>
            <Input value={form.lib} onChange={(e) => updateField("lib", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Barcode</p>
            <Input value={form.bar_code} onChange={(e) => updateField("bar_code", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">DCI</p>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
              value={form.dci}
              onChange={(e) => updateField("dci", e.target.value)}
            >
              <option value="">Select</option>
              {dciOptions.map((item) => (
                <option key={item.dci_id} value={item.label || ""}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Price</p>
            <Input type="number" step="0.001" value={form.price} onChange={(e) => updateField("price", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">VAT (%)</p>
            <Input type="number" step="0.001" value={form.vat_rate} onChange={(e) => updateField("vat_rate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">WAU Cost</p>
            <Input type="number" step="0.001" value={form.wau_cost} onChange={(e) => updateField("wau_cost", e.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Min stock</p>
            <Input type="number" value={form.min_stock} onChange={(e) => updateField("min_stock", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Safety stock</p>
            <Input type="number" value={form.safety_stock} onChange={(e) => updateField("safety_stock", e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Warning stock</p>
            <Input type="number" value={form.warning_stock} onChange={(e) => updateField("warning_stock", e.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Pharma class</p>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
              value={form.pharma_class_id}
              onChange={(e) => updateField("pharma_class_id", e.target.value)}
            >
              <option value="">Select</option>
              {pharmaClasses.map((item) => (
                <option key={item.pharma_class_id} value={item.pharma_class_id}>
                  {item.pharma_class_id} - {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Product type</p>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
              value={form.type_id}
              onChange={(e) => updateField("type_id", e.target.value)}
            >
              <option value="">Select</option>
              {productTypes.map((item) => (
                <option key={item.product_type_id} value={item.product_type_id}>
                  {item.product_type_id} - {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 flex items-end md:col-span-2 lg:col-span-1">
            <Button type="submit" disabled={!canSubmit || submitting} className="w-full rounded-xl">
              {submitting ? "Adding..." : "Add medicine"}
            </Button>
          </div>
        </form>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {success && <p className="mt-4 text-sm text-emerald-700">{success}</p>}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">Latest medicines</h3>
        {loadingProducts ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Libelle</th>
                  <th className="px-3 py-2">Barcode</th>
                  <th className="px-3 py-2">DCI</th>
                  <th className="px-3 py-2">Prix</th>
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
