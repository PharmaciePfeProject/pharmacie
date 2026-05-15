import { z } from "zod";

export const agentQuerySchema = z.object({
  search: z.string().optional(),
  agent_id: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
});

export const createAgentBodySchema = z.object({
  agent_name: z.string().min(1, "agent_name is required"),
  agent_situation: z.string().optional(),
  agent_phone_number: z.string().min(1, "agent_phone_number is required"),
  agent_address: z.string().min(1, "agent_address is required"),
  agent_start_date: z.string().optional().nullable(),
  agent_end_date: z.string().optional().nullable(),
  agent_position: z.string().optional(),
  agent_email: z.string().optional(),
  agent_salary: z.coerce.number().optional().nullable(),
  agent_status: z.enum(["Actif", "Retraite"], {
    required_error: "agent_status is required",
  }),
  agent_cin: z.string().min(1, "agent_cin is required"),
}).superRefine((data, ctx) => {
  if (!data.agent_address?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["agent_address"], message: "agent_address is required" });
  }

  if (data.agent_status === "Retraite" && !data.agent_end_date?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["agent_end_date"], message: "agent_end_date is required when status is Retraite" });
  }
});

export const updateAgentBodySchema = z.object({
  agent_name: z.string().min(1).optional(),
  agent_situation: z.string().optional(),
  agent_phone_number: z.string().min(1).optional(),
  agent_address: z.string().min(1).optional(),
  agent_start_date: z.string().optional().nullable(),
  agent_end_date: z.string().optional().nullable(),
  agent_position: z.string().optional(),
  agent_email: z.string().optional(),
  agent_salary: z.coerce.number().optional().nullable(),
  agent_status: z.enum(["Actif", "Retraite"]).optional(),
  agent_cin: z.string().min(1).optional(),
}).superRefine((data, ctx) => {
  if (data.agent_status === "Retraite" && !data.agent_end_date?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["agent_end_date"], message: "agent_end_date is required when status is Retraite" });
  }
});

export const agentParamsSchema = z.object({
  agent_id: z.coerce.number(),
});
