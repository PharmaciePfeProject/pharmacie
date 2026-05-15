import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDistributionKPIs } from "@/api/kpis";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

export default function DistributionDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getDistributionKPIs()
      .then((res) => mounted && setData(res))
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  const byDay = (data?.byDay || []).map((r) => ({ date: r.DISTRIBUTION_DATE || r.distribution_date || r.DATE_DISTRIBUTION, count: Number(r.COUNT || r.count || r.counts || 0) }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Distribution — Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div>Loading...</div>}
          {!loading && !data && <div>No data</div>}
          {!loading && data && (
            <div>
              <h3 className="mb-2 font-medium">Distributions last 30 days</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#ef4444" />
                </LineChart>
              </ResponsiveContainer>

              <h3 className="mt-6 mb-2 font-medium">Top distributed products</h3>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th>Name</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.topProducts || []).map((p, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-2">{p.LIB || p.LIBELLE || p.libelle || p.name}</td>
                        <td className="py-2">{p.TOTAL_QUANTITY || p.total_quantity || p.total || p.TOTAL || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
