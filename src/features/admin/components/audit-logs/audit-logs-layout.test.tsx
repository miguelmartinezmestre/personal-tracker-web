import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditLogsLayout from './audit-logs-layout';

const { logsState, auditTableMock } = vi.hoisted(() => ({
    logsState: [{ id: 'log_1', action: 'create' }],
    auditTableMock: vi.fn(),
}));

vi.mock('@convex-dev/better-auth/nextjs/client', () => ({
    usePreloadedAuthQuery: () => logsState,
}));

vi.mock('@/features/admin/components/audit-logs/audit-logs-table', () => ({
    AuditLogsTable: (props: any) => {
        auditTableMock(props);
        return <div data-testid="admin-audit-table">Audit table</div>;
    },
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => {
        const labels: Record<string, string> = {
            auditLogManagement: 'Audit Log Management',
            auditLogManagementDescription: 'Review system events',
        };

        return labels[key] ?? key;
    },
}));

describe('AuditLogsLayout', () => {
    beforeEach(() => {
        auditTableMock.mockReset();
    });

    it('renders audit logs admin page and passes logs to table', () => {
        render(<AuditLogsLayout preloadedAuditLogsQuery={{} as never} />);

        expect(screen.getByTestId('admin-audit-title')).toHaveTextContent('Audit Log Management');
        expect(screen.getByTestId('admin-audit-table')).toBeInTheDocument();
        expect(auditTableMock).toHaveBeenCalledWith({ logs: logsState });
    });
});
