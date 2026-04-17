export type AnalyticsTopProduct = {
  product_id: number | null;
  product_lib: string | null;
  delivered_qty: number;
};

export type AnalyticsKpis = {
  total_products?: number;
  total_stock_qty?: number;
  low_stock_products?: number;
  distributions_30d?: number;
  distributed_qty_30d?: number;
  prescriptions_30d?: number;
  stock_movements_30d?: number;
  low_stock_threshold: number;
};

export type AnalyticsKpiKey =
  | "total_products"
  | "total_stock_qty"
  | "low_stock_products"
  | "distributions_30d"
  | "distributed_qty_30d"
  | "prescriptions_30d"
  | "stock_movements_30d";

export type PowerBiTopic = "stock" | "consumption" | "distribution" | "movements" | "inventory";

export type AnalyticsKpiResponse = {
  period_days: number;
  generated_at: string;
  kpis: AnalyticsKpis;
  kpi_keys: AnalyticsKpiKey[];
  powerbi_topics: PowerBiTopic[];
  top_products: AnalyticsTopProduct[];
};
