import { z } from "zod";
import { ASSIGNABLE_ROLE_KEYS, ROLE_KEYS } from "../../utils/rbac.js";

export const userParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateUserRolesSchema = z.object({
  roles: z.array(z.enum(ASSIGNABLE_ROLE_KEYS)).min(1),
});

export const createManagedUserSchema = z.object({
  email: z.string().email(),
  username: z.string().trim().min(3),
  password: z.string().min(6),
  firstname: z.string().trim().min(1),
  lastname: z.string().trim().min(1),
  role: z.enum([
    ROLE_KEYS.MEDECIN,
    ROLE_KEYS.PHARMACIEN,
    ROLE_KEYS.RESPONSABLE_REPORTING,
  ]),
  functionName: z.string().trim().min(1).max(255).optional(),
});
