import { z } from "zod";

export const stockParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const stockQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  emplacement_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const stockLotQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  emplacement_id: z.coerce.number().int().positive().optional(),
  lot_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
