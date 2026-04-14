import { z } from "zod";

export const loginSchema = z.object({
  emailOrUsername: z.string().min(3),
  password: z.string().min(1),
});

export const updateMeSchema = z
  .object({
    email: z.string().trim().email().optional(),
    username: z.string().trim().min(3).optional(),
    firstname: z.string().trim().min(1).optional(),
    lastname: z.string().trim().min(1).optional(),
    functionName: z.string().trim().max(255).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});
