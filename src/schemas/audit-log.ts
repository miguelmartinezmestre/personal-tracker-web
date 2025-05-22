import { z } from "zod";
import { teamSchema } from "./team";
import { savedTeamSchema } from "./team";


export const auditLogSchema = z.object({
    id: z.number(),
    userId: z.number(),
    action: z.string(),
    // createdAt: z.date().nullable(),
    // updatedAt: z.date().nullable(),
});

export const savedAuditLogSchema = auditLogSchema.extend({
    id: z.number(),
});

export type AuditLog = z.infer<typeof savedAuditLogSchema>;
export type CreateAuditLog = z.infer<typeof auditLogSchema>;