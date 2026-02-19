import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from './language-switcher';

const { refreshMock, cookieSetMock, localeState } = vi.hoisted(() => ({
    refreshMock: vi.fn(),
    cookieSetMock: vi.fn(),
    localeState: { value: 'en' },
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => {
        const labels: Record<string, string> = {
            label: 'Change language',
        };

        return labels[key] ?? key;
    },
    useLocale: () => localeState.value,
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
    }),
}));

vi.mock('js-cookie', () => ({
    default: {
        set: cookieSetMock,
    },
}));

describe('LanguageSwitcher', () => {
    beforeEach(() => {
        localeState.value = 'en';
        refreshMock.mockReset();
        cookieSetMock.mockReset();
    });

    it('shows the current locale in the trigger', () => {
        render(<LanguageSwitcher />);

        expect(screen.getByTestId('language-switcher')).toHaveTextContent('English');
    });

    it('writes locale cookie and refreshes when selecting Spanish', async () => {
        const user = userEvent.setup();
        render(<LanguageSwitcher />);

        await user.click(screen.getByTestId('language-switcher'));
        await user.click(await screen.findByRole('menuitem', { name: 'Español' }));

        expect(cookieSetMock).toHaveBeenCalledWith('locale', 'es', {
            path: '/',
            sameSite: 'lax',
            expires: 365,
        });
        expect(refreshMock).toHaveBeenCalledTimes(1);
    });

    it('shows Spanish label when locale is already es', () => {
        localeState.value = 'es';
        render(<LanguageSwitcher />);

        expect(screen.getByTestId('language-switcher')).toHaveTextContent('Español');
    });
});
