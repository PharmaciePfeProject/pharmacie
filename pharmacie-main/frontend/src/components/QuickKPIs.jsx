import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  FileText,
  Truck,
  ArrowRight,
} from "lucide-react";
import { getAllKPIs } from "@/api/kpis";

export default function QuickKPIs() {
  const { messages, currentLanguage } = useLanguage();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuickKPIs();
  }, []);

  const loadQuickKPIs = async () => {
    try {
      const response = await getAllKPIs();
      setKpis(response.data);
    } catch (error) {
      console.error("Error loading KPIs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6 h-20 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">{value || "—"}</p>
          </div>
          <Icon className="w-6 h-6 opacity-20" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {currentLanguage === "en" ? "Quick KPIs" : "KPIs Rapides"}
        </h2>
        <Link to="/app/bi/kpis">
          <Button variant="outline" size="sm">
            {currentLanguage === "en" ? "View All" : "Voir tout"} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={TrendingUp}
          label={currentLanguage === "en" ? "Stock Availability" : "Disponibilité Stock"}
          value={`${kpis.stock?.availability_rate || 0}%`}
          color="#3b82f6"
        />
        <StatCard
          icon={AlertTriangle}
          label={currentLanguage === "en" ? "Stock Outs" : "Ruptures"}
          value={kpis.stock?.stock_outs || 0}
          color="#ef4444"
        />
        <StatCard
          icon={FileText}
          label={currentLanguage === "en" ? "Total Prescriptions" : "Prescriptions"}
          value={kpis.prescriptions?.total_prescriptions || 0}
          color="#8b5cf6"
        />
        <StatCard
          icon={Truck}
          label={currentLanguage === "en" ? "Total Distributions" : "Distributions"}
          value={kpis.distributions?.total_distributions || 0}
          color="#f97316"
        />
        <StatCard
          icon={DollarSign}
          label={currentLanguage === "en" ? "Stock Value" : "Valeur Stock"}
          value={`${kpis.stock?.total_value || 0} DT`}
          color="#10b981"
        />
      </div>
    </div>
  );
}
