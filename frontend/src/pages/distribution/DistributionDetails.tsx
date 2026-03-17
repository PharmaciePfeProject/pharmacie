import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchDistributionById } from "@/api/distribution";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Distribution } from "@/types/distribution";

export default function DistributionDetails() {
  const { id } = useParams();
  const [item, setItem] = useState<Distribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const distributionId = Number(id);

    if (!Number.isInteger(distributionId) || distributionId <= 0) {
      setError("Invalid distribution id.");
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const distribution = await fetchDistributionById(distributionId);
        if (active) {
          setItem(distribution);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load distribution.");
          setItem(null);
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
      <Link to="/app/distributions">
        <Button variant="outline" className="rounded-2xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to distributions
        </Button>
      </Link>

      {loading && (
        <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">
          Loading distribution...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>
      )}

      {item && !loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Distribution number</p>
              <p className="mt-2 text-lg font-semibold">{item.distribution_number || "-"}</p>
            </div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Date distribution</p>
              <p className="mt-2 text-lg font-semibold">
                {item.date_dist ? new Date(item.date_dist).toLocaleString() : "-"}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">District</p>
              <p className="mt-2 text-lg font-semibold">
                {item.district_id ?? "-"} / {item.district_label || "-"}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">User</p>
              <p className="mt-2 text-lg font-semibold">{item.username || "-"}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Day ID</p>
              <p className="mt-2 font-semibold">{item.day_id ?? "-"}</p>
            </div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="mt-2 font-semibold">
                {item.emplacement_id ?? "-"} / {item.emplacement_label || "-"}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Ordonnance ID</p>
              <p className="mt-2 font-semibold">{item.ordonnance_id ?? "-"}</p>
            </div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Lines</p>
              <p className="mt-2 text-2xl font-semibold">{item.lines.length}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold">Distribution lines</h3>
              <p className="text-sm text-muted-foreground">
                Quantitative fields are shown directly from the Oracle distribution lines.
              </p>
            </div>
            {item.lines.length === 0 ? (
              <EmptyState className="m-6 border-0 bg-muted/20 shadow-none" />
            ) : (
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">Line ID</th>
                  <th className="px-4 py-3 text-sm font-semibold">Product</th>
                  <th className="px-4 py-3 text-sm font-semibold">Delivered QT</th>
                  <th className="px-4 py-3 text-sm font-semibold">Missing QT</th>
                  <th className="px-4 py-3 text-sm font-semibold">To distribute</th>
                </tr>
              </thead>
              <tbody>
                {item.lines.map((line) => (
                  <tr key={line.line_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{line.line_id}</td>
                    <td className="px-4 py-3">
                      {line.product_id ?? "Not available"} / {line.product_lib || "Not available"}
                    </td>
                    <td className="px-4 py-3">{line.delivered_qt}</td>
                    <td className="px-4 py-3">{line.missing_qt}</td>
                    <td className="px-4 py-3">{line.to_distribute}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
