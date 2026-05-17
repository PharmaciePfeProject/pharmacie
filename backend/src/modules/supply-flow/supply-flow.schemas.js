import { z } from "zod";

export const entityParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const externalOrderQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  emplacement_id: z.coerce.number().int().positive().optional(),
  state_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const orderLineWriteSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  order_qte: z.coerce.number().positive().optional(),
  invoice_qte: z.coerce.number().positive().optional(),
  approved_qte: z.coerce.number().nonnegative().optional(),
  price: z.coerce.number().nonnegative().optional(),
  vat_rate: z.coerce.number().nonnegative().optional(),
  lot_number: z.string().trim().min(1).optional(),
  expiration_date: z.string().optional(),
});

export const internalOrderCreateSchema = z.object({
  emplacement_id: z.coerce.number().int().positive().optional(),
  day_id: z.coerce.number().int().positive().optional(),
  type_id: z.coerce.number().int().positive().optional(),
  lines: z.array(orderLineWriteSchema).min(1),
});

export const externalOrderCreateSchema = z.object({
  emplacement_id: z.coerce.number().int().positive().optional(),
  day_id: z.coerce.number().int().positive().optional(),
  supplier_label: z.string().trim().min(1),
  supplier_reference: z.string().trim().min(1).optional(),
  lines: z.array(orderLineWriteSchema).min(1),
});

export const internalOrderDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().trim().max(1000).optional(),
  lines: z.array(
    z.object({
      product_id: z.coerce.number().int().positive(),
      approved_qte: z.coerce.number().nonnegative(),
    }),
  ).optional(),
});

export const externalInvoiceCreateSchema = z.object({
  supplier_label: z.string().trim().min(1),
  invoice_number: z.string().trim().min(1).optional(),
  invoice_date: z.string().optional(),
  delivery_number: z.string().trim().min(1).optional(),
  delivery_date: z.string().optional(),
  total_amount: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().max(1000).optional(),
  lines: z.array(orderLineWriteSchema).min(1).optional(),
});

export const internalOrderQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  emplacement_id: z.coerce.number().int().positive().optional(),
  state_id: z.coerce.number().int().positive().optional(),
  type_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const receptionQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  emplacement_id: z.coerce.number().int().positive().optional(),
  state_id: z.coerce.number().int().positive().optional(),
  user_id: z.coerce.number().int().positive().optional(),
  external_order_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const internalDeliveryQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  location_id: z.coerce.number().int().positive().optional(),
  state_id: z.coerce.number().int().positive().optional(),
  user_id: z.coerce.number().int().positive().optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  internal_order_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
