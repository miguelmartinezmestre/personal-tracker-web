import type { Id } from './_generated/dataModel';
import { z } from 'zod';

export const resolveActorUserId = (
    userId: Id<'user'>,
    actorUserId: Id<'user'> | null | undefined
): Id<'user'> | undefined => (actorUserId && actorUserId !== userId ? actorUserId : undefined);
export type AuditPrimitive = string | number | boolean | null;
const auditIdContainerSchema = z.looseObject({ _id: z.string() });
export function toAuditPrimitive(value: unknown): AuditPrimitive {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'string') {
        return redactPrimitiveString(value);
    }
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    const idContainer = auditIdContainerSchema.safeParse(value);
    if (idContainer.success && typeof idContainer.data._id === 'string') {
        return idContainer.data._id;
    }
    return null;
}

function redactPrimitiveString(value: string): string {
    return value
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
        .replace(
            /\b(token|password|secret|authorization|bearer|api[_-]?key)\b\s*[:=]\s*\S+/gi,
            '$1=[redacted-secret]'
        );
}
