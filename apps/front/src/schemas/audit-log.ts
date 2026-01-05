import { z } from 'zod';

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

