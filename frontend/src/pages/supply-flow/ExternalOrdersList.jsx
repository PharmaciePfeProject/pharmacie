import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createExternalOrder, fetchExternalOrders } from "@/api/supply-flow";
import { fetchProducts } from "@/api/products";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  createDefaultPagination,
  parsePageParam,
  parsePageSizeParam,
} from "@/lib/pagination";

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function createOrderLine() {
  return {
    product_id: "",
    order_qte: "1",
  };
}

function parseNonNegativeNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function formatMoney(value) {
  return `${parseNonNegativeNumber(value).toFixed(3)} TND`;
}

function buildAutoSupplierReference() {
  const stamp = new Date()
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replaceAll(".", "")
    .replace("T", "")
    .replace("Z", "")
    .slice(0, 14);
  return `PHARM-CENTRALE-${stamp}`;
}

function buildOrderFilters(searchParams, page, pageSize) {
  return {
    product_id: parsePositiveInt(searchParams.get("product_id") || ""),
    emplacement_id: parsePositiveInt(searchParams.get("emplacement_id") || ""),
    state_id: parsePositiveInt(searchParams.get("state_id") || ""),
    date_from: searchParams.get("date_from") || undefined,
    date_to: searchParams.get("date_to") || undefined,
    page,
    pageSize,
  };
}

export default function ExternalOrdersList() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [productId, setProductId] = useState(searchParams.get("product_id") || "");
  const [emplacementId, setEmplacementId] = useState(
    searchParams.get("emplacement_id") || ""
  );
  const [stateId, setStateId] = useState(searchParams.get("state_id") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(createDefaultPagination());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [products, setProducts] = useState([]);
  const [createLines, setCreateLines] = useState([createOrderLine()]);
  const supplierLabel = "Pharmacie Centrale";
  const [supplierReference, setSupplierReference] = useState(buildAutoSupplierReference());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);

  const currentPage = parsePageParam(searchParams.get("page"));
  const currentPageSize = parsePageSizeParam(searchParams.get("pageSize"));
  const normalizedFunction = String(user?.functionName ?? user?.function ?? "")
    .trim()
    .toUpperCase();
  const isPharmacist = Array.isArray(user?.roles) && user.roles.includes("PHARMACIEN");
  const canCreateExternalOrder =
    isPharmacist && (normalizedFunction === "DEPOT" || normalizedFunction === "PHARMACIST");
  const quickTips = [
    "Create a new external order only if you work from a depot pharmacist account.",
    "External deliveries are received in depot 2.",
    "Use the filters first when you need to locate an existing order.",
    "Open an order to register the invoice and reception details.",
  ];

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product.product_id),
        label: product.lib || `Product ${product.product_id}`,
      })),
    [products]
  );

  const productById = useMemo(() => {
    const map = new Map();
    for (const product of products) {
      map.set(String(product.product_id), product);
    }
    return map;
  }, [products]);

  const pricingSummary = useMemo(() => {
    let totalHt = 0;
    let totalTtc = 0;

    for (const line of createLines) {
      const selectedProduct = productById.get(line.product_id.trim());
      if (!selectedProduct) continue;

      const quantity = parseNonNegativeNumber(line.order_qte);
      const unitPrice = parseNonNegativeNumber(selectedProduct.price);
      const vatRate = parseNonNegativeNumber(selectedProduct.vat_rate);

      const lineHt = quantity * unitPrice;
      const lineTtc = lineHt * (1 + vatRate / 100);

      totalHt += lineHt;
      totalTtc += lineTtc;
    }

    return {
      totalHt,
      totalTtc,
      totalVat: totalTtc - totalHt,
    };
  }, [createLines, productById]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const result = await fetchProducts({ page: 1, pageSize: 500 });
        if (active) {
          setProducts(result.items || []);
        }
      } catch {
        // Creating orders still works by typing product id manually.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchExternalOrders(
          buildOrderFilters(searchParams, currentPage, currentPageSize)
        );

        if (active) {
          setItems(result.items);
          setPagination(result.pagination);
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || t("externalOrders.loading"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [searchParams, currentPage, currentPageSize, t]);

  const applyFilters = () => {
    const next = new URLSearchParams();
    if (productId.trim()) next.set("product_id", productId.trim());
    if (emplacementId.trim()) next.set("emplacement_id", emplacementId.trim());
    if (stateId.trim()) next.set("state_id", stateId.trim());
    if (dateFrom.trim()) next.set("date_from", dateFrom.trim());
    if (dateTo.trim()) next.set("date_to", dateTo.trim());
    next.set("page", "1");
    next.set("pageSize", String(currentPageSize));
    setSearchParams(next);
  };

  const updatePagination = (page, pageSize = currentPageSize) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    next.set("pageSize", String(pageSize));
    setSearchParams(next);
  };

  const updateCreateLine = (index, field, value) => {
    setCreateLines((prev) =>
      prev.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line
      )
    );
  };

  const addCreateLine = () => {
    setCreateLines((prev) => [...prev, createOrderLine()]);
  };

  const removeCreateLine = (index) => {
    setCreateLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  };

  const resetCreatePanel = () => {
    setCreateLines([createOrderLine()]);
    setSupplierReference(buildAutoSupplierReference());
    setCreateError(null);
  };

  const submitExternalOrder = async () => {
    if (!canCreateExternalOrder) {
      setCreateError("Only depot pharmacists can create external orders.");
      return;
    }

    const normalizedLines = createLines
      .filter((line) => line.product_id.trim() && Number(line.order_qte) > 0)
      .map((line) => ({
        product_id: Number(line.product_id),
        order_qte: Number(line.order_qte),
      }));

    if (normalizedLines.length === 0) {
      setCreateError("Add at least one valid product line.");
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      setCreateSuccess(null);

      const created = await createExternalOrder({
        supplier_label: supplierLabel,
        supplier_reference: supplierReference,
        lines: normalizedLines,
      });

      setCreateSuccess(
        `External order #${created?.order_number || created?.external_order_id} created successfully.`
      );

      resetCreatePanel();
      setSupplierReference(buildAutoSupplierReference());

      const refreshed = await fetchExternalOrders(
        buildOrderFilters(searchParams, 1, currentPageSize)
      );
      setItems(refreshed.items);
      setPagination(refreshed.pagination);

      updatePagination(1, currentPageSize);
    } catch (err) {
      setCreateError(
        err?.response?.data?.message || "Unable to create the external order."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {canCreateExternalOrder ? (
      <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t("page.externalOrders.title")}</p>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{t("page.externalOrders.subtitle")}</h3>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Keep this screen focused on order creation, invoice registration, and traceability.
                </p>
              </div>
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick use</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {quickTips.map((tip) => (<li key={tip} className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-primary" />{tip}</li>))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Quick external order</h3>
            <p className="text-sm text-muted-foreground">
              Select products and quantities, then create the order in one click.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={addCreateLine}>
            Add product line
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supplier name</p>
            <p className="text-sm font-medium text-slate-900">{supplierLabel}</p>
            <p className="text-xs text-muted-foreground">Fixed to the central pharmacy.</p>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supplier reference</p>
            <p className="text-sm font-medium text-slate-900">{supplierReference}</p>
            <p className="text-xs text-muted-foreground">Generated automatically for each order.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {createLines.map((line, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-3 rounded-xl border p-3 md:grid-cols-[2fr_1fr_auto]"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium">Product</p>
                <select
                  className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
                  value={line.product_id}
                  onChange={(e) => updateCreateLine(index, "product_id", e.target.value)}
                >
                  <option value="">Select product</option>
                  {productOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value} - {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Quantity</p>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={line.order_qte}
                  onChange={(e) => updateCreateLine(index, "order_qte", e.target.value)}
                  placeholder="Qty"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={createLines.length === 1}
                  onClick={() => removeCreateLine(index)}
                >
                  Remove
                </Button>
              </div>

              {line.product_id.trim() && productById.get(line.product_id.trim()) ? (
                <div className="md:col-span-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {(() => {
                    const selectedProduct = productById.get(line.product_id.trim());
                    const quantity = parseNonNegativeNumber(line.order_qte);
                    const unitPrice = parseNonNegativeNumber(selectedProduct.price);
                    const vatRate = parseNonNegativeNumber(selectedProduct.vat_rate);
                    const lineHt = quantity * unitPrice;
                    const lineTtc = lineHt * (1 + vatRate / 100);

                    return (
                      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product</p>
                          <p className="font-medium">{selectedProduct.lib || `Product ${selectedProduct.product_id}`}</p>
                          <p className="text-xs text-muted-foreground">ID: {selectedProduct.product_id}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reference</p>
                          <p>{selectedProduct.bar_code || "N/A"}</p>
                          <p className="text-xs text-muted-foreground">DCI: {selectedProduct.dci || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing</p>
                          <p>Unit price: {formatMoney(unitPrice)}</p>
                          <p>VAT: {vatRate.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line total</p>
                          <p>HT: {formatMoney(lineHt)}</p>
                          <p className="font-semibold text-slate-900">TTC: {formatMoney(lineTtc)}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total HT</p>
            <p className="text-lg font-semibold text-emerald-900">{formatMoney(pricingSummary.totalHt)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total VAT</p>
            <p className="text-lg font-semibold text-emerald-900">{formatMoney(pricingSummary.totalVat)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total TTC</p>
            <p className="text-2xl font-bold text-emerald-900">{formatMoney(pricingSummary.totalTtc)}</p>
          </div>
        </div>

        {createError ? <p className="mt-4 text-sm text-destructive">{createError}</p> : null}
        {createSuccess ? <p className="mt-4 text-sm text-emerald-700">{createSuccess}</p> : null}

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={resetCreatePanel}>
            Clear form
          </Button>
          <Button type="button" disabled={creating} onClick={submitExternalOrder}>
            {creating ? "Creating..." : "Create external order"}
          </Button>
        </div>
      </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          External orders are available only for pharmacists with function DEPOT.
        </div>
      )}

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-slate-900">Order history</h3>
          <p className="text-sm text-muted-foreground">
            Filter and open existing orders.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.productId")}</p>
            <Input value={productId} onChange={(e) => setProductId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.locationId")}</p>
            <Input
              value={emplacementId}
              onChange={(e) => setEmplacementId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.stateId")}</p>
            <Input value={stateId} onChange={(e) => setStateId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.dateFrom")}</p>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.dateTo")}</p>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setProductId("");
              setEmplacementId("");
              setStateId("");
              setDateFrom("");
              setDateTo("");
              setSearchParams(
                new URLSearchParams({
                  page: "1",
                  pageSize: String(currentPageSize),
                })
              );
            }}
          >
            {t("common.reset")}
          </Button>
          <Button className="rounded-xl" onClick={applyFilters}>
            {t("common.apply")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">
          {t("externalOrders.loading")}
        </div>
      ) : null}

      {error && !loading ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState description={t("empty.description")} />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">{t("externalOrders.id")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.number")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.date")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.location")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.state")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.lines")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.external_order_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.external_order_id}</td>
                    <td className="px-4 py-3">
                      {item.order_number || t("common.notAvailable")}
                    </td>
                    <td className="px-4 py-3">
                      {item.order_date
                        ? new Date(item.order_date).toLocaleString()
                        : t("common.notAvailable")}
                    </td>
                    <td className="px-4 py-3">
                      {item.emplacement_id ?? t("common.notAvailable")} /{" "}
                      {item.emplacement_label || t("common.notAvailable")}
                    </td>
                    <td className="px-4 py-3">
                      {item.state_id ?? t("common.notAvailable")} /{" "}
                      {item.state_label || t("common.notAvailable")}
                    </td>
                    <td className="px-4 py-3">{item.lines.length}</td>
                    <td className="px-4 py-3">
                      <Link to={`/app/external-orders/${item.external_order_id}`}>
                        <Button size="sm" variant="outline" className="rounded-xl">
                          {t("common.view")}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            onPrevious={() => updatePagination(Math.max(1, pagination.page - 1))}
            onNext={() => updatePagination(Math.min(pagination.totalPages, pagination.page + 1))}
            onPageSizeChange={(pageSize) => updatePagination(1, pageSize)}
          />
        </>
      ) : null}
    </div>
  );
}
