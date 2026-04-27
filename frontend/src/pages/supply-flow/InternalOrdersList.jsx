import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  createInternalOrder,
  decideInternalOrder,
  fetchInternalOrderById,
  fetchInternalOrders,
  fetchPendingInternalOrderApprovals,
} from "@/api/supply-flow";
import { fetchProducts } from "@/api/products";
import { fetchStock } from "@/api/stock";
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
  return { product_id: "", order_qte: "1" };
}

export default function InternalOrdersList() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [productId, setProductId] = useState(searchParams.get("product_id") || "");
  const [emplacementId, setEmplacementId] = useState(searchParams.get("emplacement_id") || "");
  const [stateId, setStateId] = useState(searchParams.get("state_id") || "");
  const [typeId, setTypeId] = useState(searchParams.get("type_id") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(createDefaultPagination());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [products, setProducts] = useState([]);
  const [stockByPharmacyProduct, setStockByPharmacyProduct] = useState(new Map());
  const [stockByDepotProduct, setStockByDepotProduct] = useState(new Map());
  const [createLines, setCreateLines] = useState([createOrderLine()]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);

  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [decisionLines, setDecisionLines] = useState([]);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [decisionSuccess, setDecisionSuccess] = useState(null);
  const [expandedPendingId, setExpandedPendingId] = useState(null);
  const [expandedPendingOrder, setExpandedPendingOrder] = useState(null);

  const currentPage = parsePageParam(searchParams.get("page"));
  const currentPageSize = parsePageSizeParam(searchParams.get("pageSize"));
  const normalizedFunction = String(user?.functionName ?? user?.function ?? "")
    .trim()
    .toUpperCase();
  const assignedDepotId = Number(
    user?.assignedDepotId ?? user?.assigned_depot_id ?? user?.assignedLocationId ?? 0,
  );
  const isPharmacist = Array.isArray(user?.roles) && user.roles.includes("PHARMACIEN");
  const canConsultPendingApprovals = isPharmacist;
  const canCreateInternalOrder =
    isPharmacist && normalizedFunction === "PRESCRIPTIONS";
  const canReviewInternalApprovals =
    isPharmacist &&
    (normalizedFunction === "DEPOT" || normalizedFunction === "PHARMACIST") &&
    assignedDepotId === 2;

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product.product_id),
        label: product.lib || `Product ${product.product_id}`,
      })),
    [products],
  );

  const productById = useMemo(() => {
    const map = new Map();
    for (const product of products) {
      map.set(String(product.product_id), product);
    }
    return map;
  }, [products]);

  const createSummary = useMemo(() => {
    let totalRequested = 0;
    for (const line of createLines) {
      const quantity = Number(line.order_qte || 0);
      if (Number.isFinite(quantity) && quantity > 0) {
        totalRequested += quantity;
      }
    }
    return totalRequested;
  }, [createLines]);

  const visiblePendingRows = useMemo(() => {
    if (canConsultPendingApprovals) {
      return (pendingApprovals || []).map((approval) => ({
        row_id: `approval-${approval.approval_id}`,
        internal_order_id: approval.internal_order_id,
        order_number: approval.order_number,
        requested_depot_id: approval.requested_depot_id,
        requested_depot_label: approval.requested_depot_label,
        requested_at: approval.requested_at,
        line_count: approval.line_count || 0,
      }));
    }

    return [];
  }, [canConsultPendingApprovals, pendingApprovals]);

  const resolveAvailablePharmacyQuantity = (productId) => {
    if (!productId) return 0;
    return Number(stockByPharmacyProduct.get(String(productId)) || 0);
  };

  const resolveAvailableDepotQuantity = (productId) => {
    if (!productId) return 0;
    return Number(stockByDepotProduct.get(String(productId)) || 0);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setPendingLoading(true);
        const [productsRes, pendingRes, stockRes] = await Promise.all([
          fetchProducts({ page: 1, pageSize: 500 }),
          canConsultPendingApprovals
            ? fetchPendingInternalOrderApprovals().catch(() => [])
            : Promise.resolve([]),
          fetchStock({ page: 1, pageSize: 5000 }).catch(() => ({ items: [] })),
        ]);
        if (!active) return;
        setProducts(productsRes.items || []);
        setPendingApprovals(pendingRes || []);
        const pharmacyStockMap = new Map();
        const depotStockMap = new Map();
        for (const row of stockRes.items || []) {
          const depotLabel = String(row.emplacement_label || "").trim().toUpperCase();
          const key = String(row.product_id);
          const quantity = Number(row.quantity || 0);

          if (depotLabel === "PHARMACIE") {
            const current = Number(pharmacyStockMap.get(key) || 0);
            pharmacyStockMap.set(key, current + quantity);
            continue;
          }

          const depotCurrent = Number(depotStockMap.get(key) || 0);
          depotStockMap.set(key, depotCurrent + quantity);
        }
        setStockByPharmacyProduct(pharmacyStockMap);
        setStockByDepotProduct(depotStockMap);
      } catch {
        if (active) {
          setProducts([]);
          setPendingApprovals([]);
          setStockByPharmacyProduct(new Map());
          setStockByDepotProduct(new Map());
        }
      } finally {
        if (active) setPendingLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [canConsultPendingApprovals]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchInternalOrders({
          product_id: parsePositiveInt(searchParams.get("product_id") || ""),
          emplacement_id: parsePositiveInt(searchParams.get("emplacement_id") || ""),
          state_id: parsePositiveInt(searchParams.get("state_id") || ""),
          type_id: parsePositiveInt(searchParams.get("type_id") || ""),
          date_from: searchParams.get("date_from") || undefined,
          date_to: searchParams.get("date_to") || undefined,
          page: currentPage,
          pageSize: currentPageSize,
        });
        if (active) {
          setItems(result.items || []);
          setPagination(result.pagination);
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || t("internalOrders.loading"));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [searchParams, currentPage, currentPageSize, t]);

  const refreshPendingApprovals = async () => {
    if (!canConsultPendingApprovals) {
      setPendingApprovals([]);
      setPendingError(null);
      return;
    }
    try {
      setPendingError(null);
      const approvals = await fetchPendingInternalOrderApprovals();
      setPendingApprovals(approvals || []);
    } catch (err) {
      setPendingError(err?.response?.data?.message || "Unable to load pending approvals.");
      setPendingApprovals([]);
    }
  };

  const applyFilters = () => {
    const next = new URLSearchParams();
    if (productId.trim()) next.set("product_id", productId.trim());
    if (emplacementId.trim()) next.set("emplacement_id", emplacementId.trim());
    if (stateId.trim()) next.set("state_id", stateId.trim());
    if (typeId.trim()) next.set("type_id", typeId.trim());
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
    setCreateLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  };

  const addCreateLine = () => setCreateLines((current) => [...current, createOrderLine()]);

  const removeCreateLine = (index) => {
    setCreateLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  };

  const resetCreateForm = () => {
    setCreateLines([createOrderLine()]);
    setCreateError(null);
    setCreateSuccess(null);
  };

  const submitInternalOrder = async () => {
    if (!canCreateInternalOrder) {
      setCreateError("Only pharmacy pharmacists can create internal orders.");
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
      await createInternalOrder({ lines: normalizedLines });
      setCreateSuccess("Internal order created successfully.");
      resetCreateForm();
      await refreshPendingApprovals();
      const refreshed = await fetchInternalOrders({
        product_id: parsePositiveInt(searchParams.get("product_id") || ""),
        emplacement_id: parsePositiveInt(searchParams.get("emplacement_id") || ""),
        state_id: parsePositiveInt(searchParams.get("state_id") || ""),
        type_id: parsePositiveInt(searchParams.get("type_id") || ""),
        date_from: searchParams.get("date_from") || undefined,
        date_to: searchParams.get("date_to") || undefined,
        page: currentPage,
        pageSize: currentPageSize,
      });
      setItems(refreshed.items || []);
      setPagination(refreshed.pagination);
    } catch (err) {
      setCreateError(err?.response?.data?.message || "Unable to create the internal order.");
    } finally {
      setCreating(false);
    }
  };

  const openApproval = async (approval) => {
    setDecisionError(null);
    setDecisionSuccess(null);
    setSelectedApproval(approval);
    setSelectedOrder(null);
    setDecisionLines([]);
    try {
      const order = await fetchInternalOrderById(approval.internal_order_id);
      setSelectedOrder(order);
      setDecisionLines(
        (order.lines || []).map((line) => ({
          product_id: String(line.product_id),
          approved_qte: String(line.order_qte || 0),
        })),
      );
    } catch (err) {
      setDecisionError(err?.response?.data?.message || "Unable to load the selected order.");
    }
  };

  const togglePendingDetails = async (approval) => {
    if (expandedPendingId === approval.internal_order_id) {
      setExpandedPendingId(null);
      setExpandedPendingOrder(null);
      return;
    }

    setExpandedPendingId(approval.internal_order_id);
    if (expandedPendingOrder?.internal_order_id === approval.internal_order_id) return;

    try {
      const order = await fetchInternalOrderById(approval.internal_order_id);
      setExpandedPendingOrder(order);
    } catch {
      setExpandedPendingOrder(null);
    }
  };

  const updateDecisionLine = (index, value) => {
    setDecisionLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, approved_qte: value } : line,
      ),
    );
  };

  const submitDecision = async (decision) => {
    if (!selectedOrder) return;
    try {
      setDecisionSaving(true);
      setDecisionError(null);
      setDecisionSuccess(null);
      await decideInternalOrder(selectedOrder.internal_order_id, {
        decision,
        notes: decisionNotes.trim() || undefined,
        lines:
          decision === "APPROVED"
            ? decisionLines.map((line) => ({
                product_id: Number(line.product_id),
                approved_qte: Number(line.approved_qte),
              }))
            : [],
      });
      setDecisionSuccess(
        decision === "APPROVED" ? "Internal order approved." : "Internal order rejected.",
      );
      setSelectedApproval(null);
      setSelectedOrder(null);
      setDecisionLines([]);
      setDecisionNotes("");
      await refreshPendingApprovals();
      const refreshed = await fetchInternalOrders({
        product_id: parsePositiveInt(searchParams.get("product_id") || ""),
        emplacement_id: parsePositiveInt(searchParams.get("emplacement_id") || ""),
        state_id: parsePositiveInt(searchParams.get("state_id") || ""),
        type_id: parsePositiveInt(searchParams.get("type_id") || ""),
        date_from: searchParams.get("date_from") || undefined,
        date_to: searchParams.get("date_to") || undefined,
        page: currentPage,
        pageSize: currentPageSize,
      });
      setItems(refreshed.items || []);
      setPagination(refreshed.pagination);
    } catch (err) {
      setDecisionError(err?.response?.data?.message || "Unable to save the decision.");
    } finally {
      setDecisionSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {canCreateInternalOrder ? (
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Create internal order</h3>
            <p className="text-sm text-muted-foreground">
              Request products from another depot. The order is automatically attached to PHARMACIE for PRESCRIPTIONS pharmacists.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your depot</p>
            <p className="font-medium">PHARMACIE (automatic)</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {createLines.map((line, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border p-3 md:grid-cols-[2fr_1fr_auto]">
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
                />
              </div>

              <div className="flex items-end">
                <Button type="button" variant="outline" disabled={createLines.length === 1} onClick={() => removeCreateLine(index)}>
                  Remove
                </Button>
              </div>

              {line.product_id.trim() && productById.get(line.product_id.trim()) ? (
                <div className="md:col-span-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {(() => {
                    const selectedProduct = productById.get(line.product_id.trim());
                    const pharmacyQuantity = resolveAvailablePharmacyQuantity(line.product_id.trim());
                    const depotQuantity = resolveAvailableDepotQuantity(line.product_id.trim());
                    return (
                      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product</p>
                          <p className="font-medium">{selectedProduct.lib || `Product ${selectedProduct.product_id}`}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Barcode</p>
                          <p>{selectedProduct.bar_code || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stock in DEPOT</p>
                          <p className="font-semibold text-slate-900">{depotQuantity}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stock in PHARMACIE</p>
                          <p className="font-semibold text-slate-900">{pharmacyQuantity}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total requested quantity</p>
            <p className="text-2xl font-bold text-emerald-900">{createSummary}</p>
          </div>
          <div className="sm:col-span-1 lg:col-span-2 flex items-end justify-end gap-3">
            <Button type="button" variant="outline" onClick={addCreateLine}>Add product line</Button>
            <Button type="button" disabled={creating} onClick={submitInternalOrder}>
              {creating ? "Creating..." : "Create internal order"}
            </Button>
          </div>
        </div>

        {createError ? <p className="mt-4 text-sm text-destructive">{createError}</p> : null}
        {createSuccess ? <p className="mt-4 text-sm text-emerald-700">{createSuccess}</p> : null}
      </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Internal orders are available only for pharmacists with function PRESCRIPTIONS.
        </div>
      )}

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Pending internal approvals</h3>
            <p className="text-sm text-muted-foreground">
              Depot 2 pharmacist validates requests from PRESCRIPTIONS and compares approved quantity with available stock.
            </p>
          </div>
          <Button type="button" variant="outline" disabled={!canConsultPendingApprovals} onClick={refreshPendingApprovals}>
            Refresh
          </Button>
        </div>

        {!canConsultPendingApprovals ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Pending internal approvals are available only for pharmacists.
          </div>
        ) : null}

        {canConsultPendingApprovals && !canReviewInternalApprovals ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You can consult pending internal orders, but only pharmacists assigned to depot 2 can validate them.
          </div>
        ) : null}

        {canConsultPendingApprovals && pendingLoading ? (
          <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">Loading pending approvals...</div>
        ) : null}

        {canConsultPendingApprovals && pendingError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{pendingError}</div>
        ) : null}

        {!pendingLoading && !pendingError && visiblePendingRows.length === 0 ? (
          <EmptyState description="No pending internal orders available." />
        ) : null}

        {!pendingLoading && visiblePendingRows.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold">Order</th>
                  <th className="px-3 py-2 font-semibold">From depot</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Lines</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {visiblePendingRows.map((approval) => (
                  <Fragment key={approval.row_id}>
                    <tr className="border-t">
                      <td className="px-3 py-2 font-medium">{approval.order_number || `Internal order #${approval.internal_order_id}`}</td>
                      <td className="px-3 py-2">{approval.requested_depot_id} / {approval.requested_depot_label || "Unknown"}</td>
                      <td className="px-3 py-2">{approval.requested_at ? new Date(approval.requested_at).toLocaleString() : "N/A"}</td>
                      <td className="px-3 py-2">{approval.line_count || 0}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" disabled={decisionSaving} onClick={() => togglePendingDetails(approval)}>
                            {expandedPendingId === approval.internal_order_id ? "Hide details" : "View details"}
                          </Button>
                          {canReviewInternalApprovals ? (
                            <Button type="button" size="sm" disabled={decisionSaving} onClick={() => openApproval(approval)}>
                              Review
                            </Button>
                          ) : (
                            <Button type="button" size="sm" variant="outline" disabled>
                              Consult only
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedPendingId === approval.internal_order_id ? (
                      <tr className="border-t bg-slate-50/70">
                        <td colSpan={5} className="px-3 py-3">
                          {expandedPendingOrder ? (
                            <div className="space-y-3">
                              <div className="grid gap-2 text-sm sm:grid-cols-3">
                                <div><span className="font-semibold">Requested from:</span> {expandedPendingOrder.emplacement_id || approval.requested_depot_id} / {expandedPendingOrder.emplacement_label || approval.requested_depot_label || "Unknown"}</div>
                                <div><span className="font-semibold">State:</span> {expandedPendingOrder.state_label || "N/A"}</div>
                                <div><span className="font-semibold">Type:</span> {expandedPendingOrder.type_label || "N/A"}</div>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-100">
                                    <tr>
                                      <th className="px-2 py-2 text-left">Product</th>
                                      <th className="px-2 py-2 text-left">Requested qty</th>
                                      <th className="px-2 py-2 text-left">Approved qty</th>
                                      <th className="px-2 py-2 text-left">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {expandedPendingOrder.lines.map((line) => {
                                      const requestedQty = Number(line.order_qte || 0);
                                      const approvedQty = Number(line.approved_qte || line.order_qte || 0);
                                      const isFullyApproved = approvedQty >= requestedQty;

                                      return (
                                        <tr key={line.line_id} className="border-t">
                                          <td className="px-2 py-2">
                                            <div className="font-medium text-slate-900">{line.product_lib || "-"}</div>
                                            <div className="text-xs text-slate-500">ID: {line.product_id ?? "-"}</div>
                                          </td>
                                          <td className="px-2 py-2">{line.order_qte}</td>
                                          <td className="px-2 py-2">{approvedQty}</td>
                                          <td className="px-2 py-2">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${isFullyApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                              {isFullyApproved ? "Approved" : "Pending"}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Loading details...</p>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {selectedApproval ? (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Review {selectedOrder?.order_number || `Internal order #${selectedApproval.internal_order_id}`}
              </h3>
              <p className="text-sm text-muted-foreground">
                Requested from depot {selectedOrder?.emplacement_id || selectedApproval.requested_depot_id} / {selectedOrder?.emplacement_label || selectedApproval.requested_depot_label || "Unknown"}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => { setSelectedApproval(null); setSelectedOrder(null); setDecisionLines([]); setDecisionNotes(""); }}>
              Close
            </Button>
          </div>

          {selectedOrder ? (
            <div className="mt-4 space-y-3">
              {selectedOrder.lines.map((line, index) => (
                <div key={line.line_id} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[2fr_1fr]">
                  <div>
                    <p className="font-medium text-slate-900">{line.product_lib || `Product ${line.product_id}`}</p>
                    <p className="text-sm text-muted-foreground">Requested quantity: {line.order_qte}</p>
                    <p className="text-sm text-muted-foreground">
                      Available in depot 2: {resolveAvailableDepotQuantity(line.product_id)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Approved quantity</p>
                    <Input
                      type="number"
                      min="0"
                      max={resolveAvailableDepotQuantity(line.product_id)}
                      step="1"
                      value={decisionLines[index]?.approved_qte || "0"}
                      onChange={(e) => updateDecisionLine(index, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Notes</p>
            <Input value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} placeholder="Optional decision notes" />
          </div>

          {decisionError ? <p className="mt-4 text-sm text-destructive">{decisionError}</p> : null}
          {decisionSuccess ? <p className="mt-4 text-sm text-emerald-700">{decisionSuccess}</p> : null}

          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={decisionSaving} onClick={() => submitDecision("REJECTED")}>
              {decisionSaving ? "Saving..." : "Reject"}
            </Button>
            <Button type="button" disabled={decisionSaving} onClick={() => submitDecision("APPROVED")}>
              {decisionSaving ? "Saving..." : "Approve"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-slate-900">Order history</h3>
          <p className="text-sm text-muted-foreground">Filter existing internal orders and open their full history and line details.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.productId")}</p><Input value={productId} onChange={(e) => setProductId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.locationId")}</p><Input value={emplacementId} onChange={(e) => setEmplacementId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.stateId")}</p><Input value={stateId} onChange={(e) => setStateId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.typeId")}</p><Input value={typeId} onChange={(e) => setTypeId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.dateFrom")}</p><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full" /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.dateTo")}</p><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full" /></div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" className="rounded-xl" onClick={() => { setProductId(""); setEmplacementId(""); setStateId(""); setTypeId(""); setDateFrom(""); setDateTo(""); setSearchParams(new URLSearchParams({ page: "1", pageSize: String(currentPageSize) })); }}>
            {t("common.reset")}
          </Button>
          <Button className="rounded-xl" onClick={applyFilters}>{t("common.apply")}</Button>
        </div>
      </div>

      {loading ? <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">{t("internalOrders.loading")}</div> : null}
      {error && !loading ? <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div> : null}
      {!loading && !error && items.length === 0 ? <EmptyState description={t("empty.description")} /> : null}

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
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.type")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.lines")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.internal_order_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.internal_order_id}</td>
                    <td className="px-4 py-3">{item.order_number || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.order_date ? new Date(item.order_date).toLocaleString() : t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.emplacement_id ?? t("common.notAvailable")} / {item.emplacement_label || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.state_id ?? t("common.notAvailable")} / {item.state_label || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.type_id ?? t("common.notAvailable")} / {item.type_label || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.lines.length}</td>
                    <td className="px-4 py-3">
                      <Link to={`/app/internal-orders/${item.internal_order_id}`}>
                        <Button size="sm" variant="outline" className="rounded-xl">
                          Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} pageSize={pagination.pageSize} onPrevious={() => updatePagination(Math.max(1, pagination.page - 1))} onNext={() => updatePagination(Math.min(pagination.totalPages, pagination.page + 1))} onPageSizeChange={(pageSize) => updatePagination(1, pageSize)} />
        </>
      ) : null}
    </div>
  );
}