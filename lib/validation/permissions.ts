import { z } from "zod";

const permissionKey = z
  .string()
  .min(2, "Permission key must be at least 2 characters")
  .max(100, "Permission key must be at most 100 characters")
  .regex(/^[a-z0-9._-]+$/, "Permission key can only contain lowercase letters, numbers, dots, dashes, and underscores");

export const createPermissionSchema = z.object({
  systemId: z.number().int().positive("System ID must be a positive integer"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be at most 100 characters"),
  key: permissionKey.optional(),
  description: z.string().max(500).optional().or(z.literal("")),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
