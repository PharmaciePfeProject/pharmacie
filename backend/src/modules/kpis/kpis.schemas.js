import { z } from "zod";

export const kpisQuerySchema = z.object({
  query: z.object({
    period: z.enum(["day", "week", "month", "year"]).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});
