import { z } from "zod";

const systemName = z
  .string()
  .min(2, "System name must be at least 2 characters")
  .max(100, "System name must be at most 100 characters");

export const createSystemSchema = z.object({
  name: systemName,
  description: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

export const updateSystemSchema = z.object({
  name: systemName.optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type CreateSystemInput = z.infer<typeof createSystemSchema>;
export type UpdateSystemInput = z.infer<typeof updateSystemSchema>;
