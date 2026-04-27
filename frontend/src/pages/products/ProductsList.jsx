import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Package2, Search, SlidersHorizontal, Tags } from "lucide-react";
import { fetchProducts } from "@/api/products";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { useLanguage } from "@/i18n/LanguageContext";
import { createDefaultPagination, parsePageParam, parsePageSizeParam } from "@/lib/pagination";
import { PERMISSIONS, hasPermission } from "@/lib/roles";
function formatDecimal(value, fallback) {
    return typeof value === "number" ? value.toFixed(3) : fallback;
}
export default function ProductsList() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [typeFilter, setTypeFilter] = useState(searchParams.get("type_id") || "ALL");
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState(createDefaultPagination());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
            }
            else {
                next.delete("search");
            }
            if (typeFilter !== "ALL") {
                next.set("type_id", typeFilter);
            }
            else {
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
                    type_id: searchParams.get("type_id") && searchParams.get("type_id") !== "ALL"
                        ? Number(searchParams.get("type_id"))
                        : undefined,
                    page: currentPage,
                    pageSize: currentPageSize,
                });
                if (active) {
                    setProducts(result.items);
                    setPagination(result.pagination);
                }
            }
            catch (err) {
                if (active) {
                    setError(err?.response?.data?.message || t("products.loading"));
                }
            }
            finally {
                if (active) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            active = false;
        };
    }, [searchParams, currentPage, currentPageSize, t]);
    const updatePagination = (page, pageSize = currentPageSize) => {
        const next = new URLSearchParams(searchParams);
        next.set("page", String(page));
        next.set("pageSize", String(pageSize));
        setSearchParams(next);
    };
    return (<div className="space-y-6">
      <Card className="overflow-hidden border-white/70 bg-white/95 shadow-sm">
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package2 className="h-4 w-4 text-primary"/>
                {t("page.products.title")}
              </div>
              <p className="mt-3 text-2xl font-semibold">{pagination.total}</p>
              <p className="text-sm text-muted-foreground">{t("products.summary.records")}</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4 text-primary"/>
                {t("common.search")}
              </div>
              <p className="mt-3 text-sm font-medium text-slate-900">
                {search.trim() || t("common.all")}
              </p>
              <p className="text-sm text-muted-foreground">{t("products.summary.search")}</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tags className="h-4 w-4 text-primary"/>
                {t("common.filterType")}
              </div>
              <p className="mt-3 text-sm font-medium text-slate-900">
                {typeFilter === "ALL" ? t("common.all") : `Type ${typeFilter}`}
              </p>
              <p className="text-sm text-muted-foreground">{t("products.summary.type")}</p>
            </div>
          </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("common.search")}</p>
              <Input placeholder={t("products.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)}/>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("common.filterType")}</p>
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
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
            {canManageProducts && (<Link to="/app/admin/medicines">
                <Button className="rounded-xl">{t("common.newProduct")}</Button>
              </Link>)}
          </div>
        </div>
        </CardContent>
      </Card>

      {loading && (<div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">
          {t("products.loading")}
        </div>)}

      {error && !loading && (<div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>)}

      {!loading && !error && products.length === 0 && (<EmptyState description={t("empty.description")}/>)}

      {!loading && !error && products.length > 0 && (<>
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <SlidersHorizontal className="h-4 w-4 text-primary"/>
                {t("products.table.title")}
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {pagination.total} {t("common.items")}
              </span>
            </div>
            <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.productId")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.label")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.barcode")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.dci")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.price")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.vat")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.classType")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (<tr key={product.product_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{product.product_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{product.lib || t("common.notAvailable")}</div>
                      <div className="text-xs text-muted-foreground">{product.dci || t("common.notAvailable")}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.bar_code || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{product.dci || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{formatDecimal(product.price, t("common.notAvailable"))}</td>
                    <td className="px-4 py-3">
                      {typeof product.vat_rate === "number" ? `${product.vat_rate}%` : t("common.notAvailable")}
                    </td>
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
                        {canManageProducts && (<Link to={`/app/admin/medicines?productId=${product.product_id}`}>
                            <Button size="sm" variant="outline" className="rounded-xl">
                              {t("common.edit")}
                            </Button>
                          </Link>)}
                      </div>
                    </td>
                  </tr>))}
              </tbody>
            </table>
            </div>
          </div>

          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} pageSize={pagination.pageSize} onPrevious={() => updatePagination(Math.max(1, pagination.page - 1))} onNext={() => updatePagination(Math.min(pagination.totalPages, pagination.page + 1))} onPageSizeChange={(pageSize) => updatePagination(1, pageSize)}/>
        </>)}
    </div>);
}
