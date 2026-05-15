import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStockKPIs } from "@/api/kpis";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function StockDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getStockKPIs()
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  const pieData = data
    ? [
        { name: "Available", value: Number(data.availability?.available_count || 0) },
        { name: "Unavailable", value: Number((data.availability?.total_products || 0) - (data.availability?.available_count || 0)) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stock — Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div>Loading...</div>}
          {!loading && !data && <div>No data available</div>}
          {!loading && data && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="col-span-1">
                <h3 className="mb-2 font-medium">Availability</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#10b981" : "#ef4444"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="col-span-2">
                <h3 className="mb-2 font-medium">Consumption (last 30 days)</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={[{ label: "Avg", value: data.consumption?.avg_consumption || 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 text-sm text-muted-foreground">
                  <div>Avg: {data.consumption?.avg_consumption ?? "-"}</div>
                  <div>Max: {data.consumption?.max_consumption ?? "-"}</div>
                  <div>Min: {data.consumption?.min_consumption ?? "-"}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
