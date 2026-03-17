import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Barcode, Package2, Pill, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchProductById } from "@/api/products";
import { useAuth } from "@/auth/AuthContext";
import { PERMISSIONS, hasPermission } from "@/lib/roles";
import type { Product } from "./product.types";

function formatDecimal(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(3) : "Not available";
}

export default function ProductDetails() {
  const { user } = useAuth();
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManageProducts = hasPermission(user, PERMISSIONS.PRODUCTS_MANAGE);
  const canReadStock = hasPermission(user, PERMISSIONS.STOCK_READ);

  useEffect(() => {
    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
      setError("Invalid product id.");
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const item = await fetchProductById(productId);
        if (active) {
          setProduct(item);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load product details.");
          setProduct(null);
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
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/app/products">
          <Button variant="outline" className="rounded-2xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to products
          </Button>
        </Link>

        <div className="flex gap-3">
          {product && canReadStock && (
            <Link to={`/app/stock?product_id=${product.product_id}`}>
              <Button variant="outline" className="rounded-2xl">
                View stock
              </Button>
            </Link>
          )}
          {canManageProducts && (
            <>
              <Button variant="outline" className="rounded-2xl">
                Edit
              </Button>
              <Button className="rounded-2xl">Update master data</Button>
            </>
          )}
        </div>
      </div>

      {loading && (
        <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">
          Loading product details...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>
      )}

      {product && !loading && !error && (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Product details</p>
                  <h2 className="mt-1 text-2xl font-semibold">{product.lib || "Unnamed product"}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Master data aligned with the product dimension.
                  </p>
                </div>

                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Product #{product.product_id}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Barcode className="h-4 w-4" />
                    Barcode
                  </div>
                  <p className="font-medium">{product.bar_code || "-"}</p>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Package2 className="h-4 w-4" />
                    DCI
                  </div>
                  <p className="font-medium">{product.dci || "-"}</p>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <ReceiptText className="h-4 w-4" />
                    Price
                  </div>
                  <p className="font-medium">{formatDecimal(product.price)}</p>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Pill className="h-4 w-4" />
                    VAT rate
                  </div>
                  <p className="font-medium">
                    {typeof product.vat_rate === "number" ? `${product.vat_rate}%` : "Not available"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">Dimension attributes</p>
              <h3 className="mt-1 text-xl font-semibold">Reference thresholds</h3>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">WAU cost</p>
                  <p className="mt-1 text-3xl font-semibold text-primary">
                    {formatDecimal(product.wau_cost)}
                  </p>
                </div>

                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Minimum stock</p>
                  <p className="mt-1 font-medium">{product.min_stock ?? "Not available"}</p>
                </div>

                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Safety stock</p>
                  <p className="mt-1 font-medium">{product.safety_stock ?? "Not available"}</p>
                </div>

                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Warning stock</p>
                  <p className="mt-1 font-medium">{product.warning_stock ?? "Not available"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Pharma class ID</p>
              <p className="mt-2 text-2xl font-semibold">{product.pharma_class_id ?? "-"}</p>
            </div>

            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Type ID</p>
              <p className="mt-2 text-2xl font-semibold">{product.type_id ?? "-"}</p>
            </div>

            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Master data scope</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Stock, locations, lots, movements, and consumption are intentionally excluded from this phase.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
