import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsersLayout from './users-layout';

const { usersState, usersTableMock } = vi.hoisted(() => ({
  usersState: [{ id: 'u1', email: 'user@example.com' }],
  usersTableMock: vi.fn(),
}));

vi.mock('@convex-dev/better-auth/nextjs/client', () => ({
  usePreloadedAuthQuery: () => usersState,
}));

vi.mock('@/features/admin/components/users/users-table', () => ({
  UsersTable: (props: any) => {
    usersTableMock(props);
    return <div data-testid="admin-users-table">Users table</div>;
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      userManagement: 'User Management',
      userManagementDescription: 'Manage system users',
    };

    return labels[key] ?? key;
  },
}));

describe('UsersLayout', () => {
  beforeEach(() => {
    usersTableMock.mockReset();
  });

  it('renders users admin page and passes data to table', () => {
    render(<UsersLayout preloadedUsersQuery={{} as never} />);

    expect(screen.getByTestId('admin-users-title')).toHaveTextContent('User Management');
    expect(screen.getByTestId('admin-users-table')).toBeInTheDocument();
    expect(usersTableMock).toHaveBeenCalledWith({ users: usersState });
  });
});
