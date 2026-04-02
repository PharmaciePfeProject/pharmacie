export type DistributionLine = {
  line_id: number;
  product_id: number | null;
  product_lib: string | null;
  delivered_qt: number;
  missing_qt: number;
  to_distribute: number;
};

export type Distribution = {
  distribution_id: number;
  date_dist: string | null;
  distribution_number: string | null;
  day_id: number | null;
  district_id: number | null;
  district_label: string | null;
  emplacement_id: number | null;
  emplacement_label: string | null;
  user_id: number | null;
  username: string | null;
  ordonnance_id: number | null;
  lines: DistributionLine[];
};
