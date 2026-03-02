import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommandMenu from './command';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const labels: Record<string, string> = {
      'CommandMenu.placeholder': 'Search commands...',
      'CommandMenu.empty': 'No results found.',
      'CommandMenu.navigation': 'Navigation',
      'Sidebar.home': 'Home',
      'Sidebar.objectives': 'Objectives',
      'Sidebar.notifications': 'Notifications',
      'Sidebar.sessions': 'Sessions',
    };

    return labels[`${namespace}.${key}`] ?? `${namespace}.${key}`;
  },
}));

describe('CommandMenu', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('opens command dialog with Ctrl+K', async () => {
    render(<CommandMenu />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(await screen.findByPlaceholderText('Search commands...')).toBeInTheDocument();
  });

  it('opens command dialog with Meta+K', async () => {
    render(<CommandMenu />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    expect(await screen.findByPlaceholderText('Search commands...')).toBeInTheDocument();
  });

  it('navigates to objectives when selecting command item', async () => {
    const user = userEvent.setup();
    render(<CommandMenu />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await user.click(await screen.findByText('Objectives'));

    expect(pushMock).toHaveBeenCalledWith('/dashboard/objectives');
  });

  it('closes command dialog with Escape', async () => {
    render(<CommandMenu />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(await screen.findByPlaceholderText('Search commands...')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search commands...')).not.toBeInTheDocument();
    });
  });
});
