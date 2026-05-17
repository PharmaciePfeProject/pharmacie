import { z } from "zod";

export const locationBodySchema = z.object({
  lib: z.string().trim().min(1),
});

export const movementTypeBodySchema = z.object({
  label: z.string().trim().min(1),
});
