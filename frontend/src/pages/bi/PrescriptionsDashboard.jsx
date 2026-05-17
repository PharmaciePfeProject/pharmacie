import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrescriptionsKPIs } from "@/api/kpis";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";

export default function PrescriptionsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getPrescriptionsKPIs()
      .then((res) => mounted && setData(res))
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  const topMedicines = data?.topMedicines || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prescriptions — Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div>Loading...</div>}
          {!loading && !data && <div>No data</div>}
          {!loading && data && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="col-span-2">
                <h3 className="mb-2 font-medium">Top prescribed medicines</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topMedicines.map((m) => ({ name: m.LIB || m.LIBELLE || m.libelle || m.name, value: Number(m.TOTAL_QUANTITY || m.total_quantity || m.PRESCRIPTION_COUNT || m.prescription_count || 0) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="col-span-1">
                <h3 className="mb-2 font-medium">Quick stats</h3>
                <div className="space-y-2 text-sm">
                  <div>Total prescriptions: {data.totalPrescriptions?.TOTAL ?? data.totalPrescriptions?.total ?? "-"}</div>
                  <div>Avg quantity: {data.avgQuantity?.AVG_QUANTITY ?? data.avgQuantity?.avg_quantity ?? "-"}</div>
                  <div>Top doctors: {data.prescriptionsByDoctor?.slice(0,3).map(d=>d.DOCTOR_NAME||d.doctor_name||d.doctor).join(", ") || '-'}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
