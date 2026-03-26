export type ExternalOrderLine = {
  line_id: number;
  product_id: number | null;
  product_lib: string | null;
  order_qte: number;
  price: number | null;
  vat_rate: number | null;
};

export type ExternalOrder = {
  external_order_id: number;
  order_number: string | null;
  order_date: string | null;
  day_id: number | null;
  emplacement_id: number | null;
  emplacement_label: string | null;
  state_id: number | null;
  state_label: string | null;
  lines: ExternalOrderLine[];
};

export type InternalOrderLine = {
  line_id: number;
  product_id: number | null;
  product_lib: string | null;
  order_qte: number;
};

export type InternalOrder = {
  internal_order_id: number;
  order_number: string | null;
  order_date: string | null;
  day_id: number | null;
  emplacement_id: number | null;
  emplacement_label: string | null;
  state_id: number | null;
  state_label: string | null;
  type_id: number | null;
  type_label: string | null;
  lines: InternalOrderLine[];
};

export type ReceptionLine = {
  line_id: number;
  product_id: number | null;
  product_lib: string | null;
  lot_label: string | null;
  expiration_date: string | null;
  invoice_qte: number;
  reception_qte: number;
  price: number;
  vat: number;
};

export type Reception = {
  reception_id: number;
  reception_number: string | null;
  date_reception: string | null;
  date_liv: string | null;
  date_invoice: string | null;
  num_external_delivery: string | null;
  num_invoice: string | null;
  day_id: number | null;
  external_order_id: number | null;
  external_order_number: string | null;
  emplacement_id: number | null;
  emplacement_label: string | null;
  state_id: number | null;
  state_label: string | null;
  user_id: number | null;
  username: string | null;
  type_id: number | null;
  type_label: string | null;
  lines: ReceptionLine[];
};

export type InternalDeliveryLine = {
  line_id: number;
  product_id: number | null;
  product_lib: string | null;
  lot_id: number | null;
  lot_label: string | null;
  qte: number;
  missing_qte: number;
};

export type InternalDelivery = {
  internal_delivery_id: number;
  delivery_number: string | null;
  date_delivery: string | null;
  customer_id: number | null;
  customer_label: string | null;
  day_id: number | null;
  internal_order_id: number | null;
  internal_order_number: string | null;
  location_id: number | null;
  location_label: string | null;
  state_id: number | null;
  state_label: string | null;
  user_id: number | null;
  username: string | null;
  lines: InternalDeliveryLine[];
};
