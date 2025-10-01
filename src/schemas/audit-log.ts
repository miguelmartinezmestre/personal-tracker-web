import { z } from "zod";

export const auditLogSchema = z.object({
    id: z.number(),
    userId: z.number(),
    action: z.string(),
    // createdAt: z.date().nullable(),
    // updatedAt: z.date().nullable(),
});

export const savedAuditLogSchema = auditLogSchema.extend({
    _id: z.string(),
});

export type AuditLog = z.infer<typeof savedAuditLogSchema>;
export type CreateAuditLog = z.infer<typeof auditLogSchema>;