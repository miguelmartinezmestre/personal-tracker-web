import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsLayout from './notifications-layout';

const { notificationsState, objectivesState, notificationsTableMock } = vi.hoisted(() => ({
  notificationsState: [{ id: 'n1', message: 'Reminder' }],
  objectivesState: [{ id: 'o1', title: 'Run 5k' }],
  notificationsTableMock: vi.fn(),
}));

let authQueryCall = 0;

vi.mock('@convex-dev/better-auth/nextjs/client', () => ({
  usePreloadedAuthQuery: () => {
    authQueryCall += 1;
    return authQueryCall === 1 ? notificationsState : objectivesState;
  },
}));

vi.mock('./notifications-table', () => ({
  default: (props: any) => {
    notificationsTableMock(props);
    return <div data-testid="notifications-table">Notifications table</div>;
  },
}));

vi.mock('./notification-form-create-modal', () => ({
  default: () => <button data-testid="notification-create-open">Create notification</button>,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      title: 'Notifications',
      description: 'Track alerts and reminders',
    };

    return labels[key] ?? key;
  },
}));

describe('NotificationsLayout', () => {
  beforeEach(() => {
    authQueryCall = 0;
    notificationsTableMock.mockReset();
  });

  it('renders notifications page and forwards notifications/objectives', () => {
    render(
      <NotificationsLayout
        preloadedNotificationsQuery={{} as never}
        preloadedObjectivesQuery={{} as never}
      />
    );

    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Track alerts and reminders')).toBeInTheDocument();
    expect(screen.getByTestId('notification-create-open')).toBeInTheDocument();
    expect(screen.getByTestId('notifications-table')).toBeInTheDocument();
    expect(notificationsTableMock).toHaveBeenCalledWith({
      initialNotifications: notificationsState,
      initialObjectives: objectivesState,
    });
  });
});
