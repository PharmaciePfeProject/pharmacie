import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReportingKPIs } from "@/api/kpis";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

export default function ReportingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getReportingKPIs()
      .then((res) => mounted && setData(res))
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  const monthly = (data?.monthlyConsumption || []).map((r) => ({ month: r.MONTH || r.month || r.monthly, value: Number(r.TOTAL_CONSUMPTION || r.total_consumption || r.total || 0) }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reporting — Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div>Loading...</div>}
          {!loading && !data && <div>No data</div>}
          {!loading && data && (
            <div>
              <h3 className="mb-2 font-medium">Monthly consumption (last 12 months)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="colorU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" fillOpacity={1} fill="url(#colorU)" />
                </AreaChart>
              </ResponsiveContainer>

              <h3 className="mt-6 mb-2 font-medium">Stock evolution (last 30 days)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={(data.stockEvolution || []).map((r) => ({ date: r.MOVEMENT_DATE || r.movement_date || r.DATE || r.date || r.DATE_MOUVEMENT || r.date_mouvement, entries: Number(r.ENTRIES || r.entries || r.ENTREE || r.entries_count || 0), exits: Number(r.EXITS || r.exits || r.SORTIE || r.exits_count || 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="entries" stroke="#10b981" />
                  <Line type="monotone" dataKey="exits" stroke="#ef4444" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
