import { z } from "zod";

export const distributionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const distributionQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  district_id: z.coerce.number().int().positive().optional(),
  emplacement_id: z.coerce.number().int().positive().optional(),
  user_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
