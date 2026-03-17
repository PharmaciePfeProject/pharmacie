import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  functionName: z.enum([
    "PHARMACIST",
    "PREPARATEUR",
    "STOCK_MANAGER",
    "DOCTOR",
    "REPORTING",
  ]),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(3),
  password: z.string().min(1),
});