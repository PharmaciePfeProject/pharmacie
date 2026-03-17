export type StockRecord = {
  stock_id: number;
  quantity: number;
  locker: string | null;
  product_id: number | null;
  product_lib: string | null;
  product_bar_code: string | null;
  emplacement_id: number | null;
  emplacement_label: string | null;
};

export type StockLotRecord = {
  stock_lot_id: number;
  quantity: number;
  lot_id: number | null;
  lot_label: string | null;
  lot_state: number | null;
  date_refusal: string | null;
  product_id: number | null;
  product_lib: string | null;
  emplacement_id: number | null;
  emplacement_label: string | null;
};
