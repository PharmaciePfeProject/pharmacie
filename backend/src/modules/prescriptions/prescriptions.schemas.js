import { z } from "zod";

export const prescriptionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const patientCardParamsSchema = z.object({
  agentId: z.string().trim().min(1),
});

export const approvePrescriptionBodySchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "REJECTED" && !value.notes) {
      ctx.addIssue({
        code: "custom",
        path: ["notes"],
        message: "A rejection reason is required.",
      });
    }
  });

export const prescriptionQuerySchema = z.object({
  doctor_id: z.coerce.number().int().positive().optional(),
  product_id: z.coerce.number().int().positive().optional(),
  prescription_number: z.string().trim().min(1).optional(),
  patient_name: z.string().trim().min(1).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

const prescriptionLineBodySchema = z.object({
  product_id: z.coerce.number().int().positive(),
  total_qt: z.coerce.number().positive(),
  days: z.coerce.number().int().positive().optional(),
  dist_number: z.coerce.number().int().positive().optional(),
  is_periodic: z.coerce.number().int().min(0).max(1).optional(),
  periodicity: z.string().trim().max(255).optional(),
  posologie: z.string().trim().max(255).optional(),
  distributed: z.coerce.number().int().min(0).max(1).optional(),
});

export const createPrescriptionBodySchema = z.object({
  agent_id: z.string().trim().max(255).optional(),
  agent_situation: z.string().trim().max(255).optional(),
  distributed: z.coerce.number().int().min(0).max(1).optional(),
  prescription_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  prescription_number: z.string().trim().max(255).optional(),
  type: z.string().trim().max(255).optional(),
  doctor_id: z.coerce.number().int().positive(),
  lines: z.array(prescriptionLineBodySchema).min(1),
  radios: z.array(z.string().trim().min(1).max(500)).max(25).optional(),
  analyses: z.array(z.string().trim().min(1).max(500)).max(25).optional(),
});
