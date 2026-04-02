export type StockMovementLine = {
  line_id: number;
  product_id: number | null;
  product_lib: string | null;
  lot_id: number | null;
  lot_label: string | null;
  movement_qte: number;
  motif_id: number | null;
};

export type StockMovement = {
  movement_id: number;
  num_movement: string | null;
  date_movement: string | null;
  type_mvt: string | null;
  descriminator: string | null;
  reference_type_id: number | null;
  reference_type_label: string | null;
  location_id: number | null;
  location_label: string | null;
  user_id: number | null;
  username: string | null;
  day_id: number | null;
  distribution_id: number | null;
  internal_delivery_id: number | null;
  reception_id: number | null;
  lines: StockMovementLine[];
};
