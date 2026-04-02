import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchDistributionById } from "@/api/distribution";
import {
  DetailBackLink,
  DetailHero,
  DetailSection,
  DetailStatCard,
  DetailStatGrid,
  formatDetailValue,
} from "@/components/ui/detail-view";
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
      <DetailBackLink to="/app/distributions" label="Back to distributions" />

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
          <DetailHero
            eyebrow="Distribution"
            title={String(item.distribution_number || `Distribution #${item.distribution_id}`)}
            description="Review the distribution header first, then scan the quantitative line items below. The layout is organized to surface the most important operational context quickly."
            badge={`${item.lines.length} line${item.lines.length === 1 ? "" : "s"}`}
          />

          <DetailStatGrid>
            <DetailStatCard
              label="Distribution date"
              value={item.date_dist ? new Date(item.date_dist).toLocaleString() : "Not available"}
              emphasis
            />
            <DetailStatCard
              label="District"
              value={`${formatDetailValue(item.district_id, "-")} / ${formatDetailValue(item.district_label, "-")}`}
            />
            <DetailStatCard label="User" value={formatDetailValue(item.username)} />
            <DetailStatCard label="Lines" value={item.lines.length} emphasis />
          </DetailStatGrid>

          <DetailStatGrid>
            <DetailStatCard label="Day ID" value={formatDetailValue(item.day_id, "-")} />
            <DetailStatCard
              label="Location"
              value={`${formatDetailValue(item.emplacement_id, "-")} / ${formatDetailValue(item.emplacement_label, "-")}`}
            />
            <DetailStatCard label="Ordonnance ID" value={formatDetailValue(item.ordonnance_id, "-")} />
            <DetailStatCard label="Record ID" value={formatDetailValue(item.distribution_id, "-")} />
          </DetailStatGrid>

          <DetailSection
            title="Distribution lines"
            description="Quantitative fields are shown directly from the Oracle distribution lines."
          >
            {item.lines.length === 0 ? (
              <EmptyState className="m-6 border-0 bg-muted/20 shadow-none" />
            ) : (
            <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-slate-50">
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
                  <tr key={line.line_id} className="border-t border-slate-200 hover:bg-emerald-50/30">
                    <td className="px-4 py-3 font-medium">{line.line_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{formatDetailValue(line.product_lib)}</div>
                      <div className="text-xs text-slate-500">Product ID: {formatDetailValue(line.product_id, "-")}</div>
                    </td>
                    <td className="px-4 py-3">{line.delivered_qt}</td>
                    <td className="px-4 py-3">{line.missing_qt}</td>
                    <td className="px-4 py-3">{line.to_distribute}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            )}
          </DetailSection>
        </>
      )}
    </div>
  );
}
