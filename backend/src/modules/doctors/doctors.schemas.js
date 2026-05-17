import { z } from "zod";

export const doctorParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const doctorQuerySchema = z.object({
  search: z.string().trim().optional(),
  specialty: z.string().trim().optional(),
  actived: z.coerce.number().int().min(0).max(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

const baseDoctorBody = {
  name: z.string().trim().min(1).max(255),
  specialty: z.string().trim().max(255).optional(),
  address: z.string().trim().max(255).optional(),
  tel: z.coerce.number().int().positive().optional(),
};

export const createDoctorBodySchema = z.object(baseDoctorBody);

export const updateDoctorBodySchema = z.object({
  ...baseDoctorBody,
  actived: z.coerce.number().int().min(0).max(1).optional(),
});
