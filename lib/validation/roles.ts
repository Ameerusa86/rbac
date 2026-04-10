import { z } from "zod";

const roleName = z
  .string()
  .min(2, "Role name must be at least 2 characters")
  .max(100, "Role name must be at most 100 characters");

export const createRoleSchema = z.object({
  name: roleName,
  description: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean().optional().default(true),
  permissions: z.array(z.string().min(1).max(100)).optional().default([]),
});

export const updateRoleSchema = z.object({
  name: roleName.optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string().min(1).max(100)).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
