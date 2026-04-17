import { z } from "zod";

export const productParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  type_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const productBodySchema = z.object({
  lib: z.string().trim().min(1),
  bar_code: z.string().trim().min(1),
  price: z.coerce.number().nonnegative(),
  vat_rate: z.coerce.number().nonnegative(),
  wau_cost: z.coerce.number().nonnegative(),
  min_stock: z.coerce.number().nonnegative(),
  safety_stock: z.coerce.number().nonnegative(),
  warning_stock: z.coerce.number().nonnegative(),
  dci: z.string().trim().min(1),
  pharma_class_id: z.coerce.number().int().positive(),
  type_id: z.coerce.number().int().positive(),
});
