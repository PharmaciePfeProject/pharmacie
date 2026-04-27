import { z } from "zod";
import { ASSIGNABLE_ROLE_KEYS, ROLE_KEYS } from "../../utils/rbac.js";

const PHARMACIST_FUNCTION_VALUES = ["PRESCRIPTIONS", "DEPOT"];

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
  doctorSpecialty: z.string().trim().min(1).max(255).optional(),
  assignedLocationId: z.coerce.number().int().positive().optional(),
}).superRefine((value, ctx) => {
  if (value.role === ROLE_KEYS.PHARMACIEN) {
    const normalizedFunction = String(value.functionName || "")
      .trim()
      .toUpperCase();

    if (!normalizedFunction) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["functionName"],
        message: "Function is required for pharmacists",
      });
      return;
    }

    if (!PHARMACIST_FUNCTION_VALUES.includes(normalizedFunction)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["functionName"],
        message: "Function must be PRESCRIPTIONS or DEPOT for pharmacists",
      });
    }

    if (normalizedFunction === "DEPOT" && value.assignedLocationId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assignedLocationId"],
        message: "Depot is required when pharmacist function is DEPOT",
      });
    }
  }

  if (value.role === ROLE_KEYS.MEDECIN) {
    const specialty = String(value.doctorSpecialty || "").trim();
    if (!specialty) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["doctorSpecialty"],
        message: "Doctor specialty is required",
      });
    }
  }
});

export const updateUserDepotSchema = z.object({
  locationId: z.coerce.number().int().positive(),
});

export const updateManagedUserSchema = z
  .object({
    email: z.string().email().optional(),
    username: z.string().trim().min(3).optional(),
    firstname: z.string().trim().min(1).optional(),
    lastname: z.string().trim().min(1).optional(),
    functionName: z.string().trim().min(1).max(255).nullable().optional(),
    doctorSpecialty: z.string().trim().min(1).max(255).nullable().optional(),
    assignedLocationId: z.coerce.number().int().positive().nullable().optional(),
  })
  .refine(
    (value) =>
      value.email !== undefined ||
      value.username !== undefined ||
      value.firstname !== undefined ||
      value.lastname !== undefined ||
      value.functionName !== undefined ||
      value.doctorSpecialty !== undefined ||
      value.assignedLocationId !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

export const updateUserStatusSchema = z.object({
  actived: z.union([z.literal(0), z.literal(1), z.literal("0"), z.literal("1")]),
});
