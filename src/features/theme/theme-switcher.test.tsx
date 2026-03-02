import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from './theme-switcher';

const setThemeMock = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => ({
    setTheme: setThemeMock,
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      toggle: 'Toggle theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    };

    return labels[key] ?? key;
  },
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    setThemeMock.mockReset();
  });

  it('renders the theme trigger button', () => {
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
  });

  it('sets dark theme when dark option is selected', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Dark' }));

    expect(setThemeMock).toHaveBeenCalledWith('dark');
  });

  it('sets light theme when light option is selected', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Light' }));

    expect(setThemeMock).toHaveBeenCalledWith('light');
  });

  it('sets system theme when system option is selected', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    await user.click(await screen.findByRole('menuitem', { name: 'System' }));

    expect(setThemeMock).toHaveBeenCalledWith('system');
  });
});
