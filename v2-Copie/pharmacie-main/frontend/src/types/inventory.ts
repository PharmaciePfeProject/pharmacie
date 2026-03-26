export type InventoryLine = {
  line_id: number;
  product_id: number | null;
  product_lib: string | null;
  lot_id: number | null;
  lot_label: string | null;
  invent_qte: number;
  stock_qte: number;
  stock_qte_lot: number;
  discard: number;
  price: number;
  vat_rate: number;
};

export type Inventory = {
  inventory_id: number;
  date_inv: string | null;
  location_id: number | null;
  location_label: string | null;
  state_id: number | null;
  state_label: string | null;
  user_id: number | null;
  username: string | null;
  lines: InventoryLine[];
};
