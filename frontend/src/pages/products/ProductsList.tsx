import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchProducts } from "@/api/products";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { useLanguage } from "@/i18n/LanguageContext";
import { createDefaultPagination, parsePageParam, parsePageSizeParam } from "@/lib/pagination";
import { PERMISSIONS, hasPermission } from "@/lib/roles";
import type { PaginationMeta } from "@/types/pagination";
import type { Product } from "./product.types";

function formatDecimal(value: number | null | undefined, fallback: string) {
  return typeof value === "number" ? value.toFixed(3) : fallback;
}

export default function ProductsList() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type_id") || "ALL");
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(createDefaultPagination());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPage = parsePageParam(searchParams.get("page"));
  const currentPageSize = parsePageSizeParam(searchParams.get("pageSize"));
  const canManageProducts = hasPermission(user, PERMISSIONS.PRODUCTS_MANAGE);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setTypeFilter(searchParams.get("type_id") || "ALL");
  }, [searchParams]);

  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    const currentType = searchParams.get("type_id") || "ALL";
    const normalizedSearch = search.trim();

    if (normalizedSearch === currentSearch && typeFilter === currentType) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);

      if (normalizedSearch) {
        next.set("search", normalizedSearch);
      } else {
        next.delete("search");
      }

      if (typeFilter !== "ALL") {
        next.set("type_id", typeFilter);
      } else {
        next.delete("type_id");
      }

      next.set("page", "1");
      next.set("pageSize", String(currentPageSize));
      setSearchParams(next);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search, typeFilter, searchParams, setSearchParams, currentPageSize]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchProducts({
          search: searchParams.get("search") || undefined,
          type_id:
            searchParams.get("type_id") && searchParams.get("type_id") !== "ALL"
              ? Number(searchParams.get("type_id"))
              : undefined,
          page: currentPage,
          pageSize: currentPageSize,
        });
        if (active) {
          setProducts(result.items);
          setPagination(result.pagination);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || t("products.loading"));
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

  const updatePagination = (page: number, pageSize = currentPageSize) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    next.set("pageSize", String(pageSize));
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("common.search")}</p>
              <Input
                placeholder={t("products.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("common.filterType")}</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">{t("common.all")}</option>
                <option value="1">{t("products.type1")}</option>
                <option value="2">{t("products.type2")}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" className="rounded-xl">
              {t("common.export")}
            </Button>
            {canManageProducts && (
              <Link to="/app/admin/medicines">
                <Button className="rounded-xl">{t("common.newProduct")}</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">
          {t("products.loading")}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <EmptyState description={t("empty.description")} />
      )}

      {!loading && !error && products.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.productId")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.label")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.barcode")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.dci")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.price")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.vat")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.wauCost")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.warningStock")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.classType")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.product_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{product.product_id}</td>
                    <td className="px-4 py-3">{product.lib || t("common.notAvailable")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.bar_code || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{product.dci || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{formatDecimal(product.price, t("common.notAvailable"))}</td>
                    <td className="px-4 py-3">
                      {typeof product.vat_rate === "number" ? `${product.vat_rate}%` : t("common.notAvailable")}
                    </td>
                    <td className="px-4 py-3">{formatDecimal(product.wau_cost, t("common.notAvailable"))}</td>
                    <td className="px-4 py-3">{product.warning_stock ?? t("common.notAvailable")}</td>
                    <td className="px-4 py-3">
                      {product.pharma_class_id ?? t("common.notAvailable")} / {product.type_id ?? t("common.notAvailable")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link to={`/app/products/${product.product_id}`}>
                          <Button size="sm" variant="outline" className="rounded-xl">
                            {t("common.view")}
                          </Button>
                        </Link>
                        {canManageProducts && (
                          <Button size="sm" variant="outline" className="rounded-xl">
                            {t("common.edit")}
                          </Button>
                        )}
                      </div>
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
      )}
    </div>
  );
}
