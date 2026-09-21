'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ThemeToggleProps = {
    testId?: string;
};

export function ThemeToggle({ testId = 'theme-toggle' }: ThemeToggleProps) {
    const t = useTranslations('ThemeSwitcher');
    const { setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button variant="outline" size="icon" data-testid={testId}>
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">{t('toggle')}</span>
                    </Button>
                }
            />
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    data-testid="theme-option-light"
                    onClick={() => setTheme('light')}
                >
                    {t('light')}
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="theme-option-dark" onClick={() => setTheme('dark')}>
                    {t('dark')}
                </DropdownMenuItem>
                <DropdownMenuItem
                    data-testid="theme-option-system"
                    onClick={() => setTheme('system')}
                >
                    {t('system')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
