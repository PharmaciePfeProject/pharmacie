import { z } from "zod";
import { ROLE_KEYS } from "../../utils/rbac.js";

export const userParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateUserRolesSchema = z.object({
  roles: z.array(z.enum(Object.values(ROLE_KEYS))).min(1),
});
