import { queryWithRLS } from "./rls";

export const getAuditLogs = queryWithRLS({
    args: {},
    handler: async (ctx) => {
        const logs = await ctx.db.query("auditLogs").collect();
        // Ordenar por fecha descendente (más recientes primero)
        return logs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
    },
});

