'use client';

import { useState, useEffect } from 'react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@repo/ui/components/command';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Home, User, Bell, Goal } from 'lucide-react';

export default function CommandMenu() {
    const t = useTranslations('CommandMenu');
    const tSidebar = useTranslations('Sidebar');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen(open => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    const router = useRouter();

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder={t('placeholder')} />
            <CommandList>
                <CommandEmpty>{t('empty')}</CommandEmpty>

                <CommandGroup heading={t('navigation')}>
                    <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/home'))}>
                        <Home className="mr-2 h-4 w-4" />
                        <span>{tSidebar('home')}</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard/objectives'))}
                    >
                        <Goal className="mr-2 h-4 w-4" />
                        <span>{tSidebar('objectives')}</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard/notifications'))}
                    >
                        <Bell className="mr-2 h-4 w-4" />
                        <span>{tSidebar('notifications')}</span>
                    </CommandItem>

                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard/sessions'))}
                    >
                        <User className="mr-2 h-4 w-4" />
                        <span>{tSidebar('sessions')}</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />
            </CommandList>
        </CommandDialog>
    );
}
