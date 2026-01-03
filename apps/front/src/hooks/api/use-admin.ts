'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';

/**
 * Hook para obtener los logs de auditoría
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useAuditLogs() {
    return useQuery(convexQuery(api.auditLogs.getAuditLogs, {}));
}
