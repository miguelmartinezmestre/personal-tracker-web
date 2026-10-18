'use client';

import { useState } from 'react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Home, Mail, Target, Users } from 'lucide-react';
import { useMountEffect } from '@/hooks/use-mount-effect';

export default function CommandMenu() {
    const t = useTranslations('CommandMenu');
    const tSidebar = useTranslations('Sidebar');
    const [open, setOpen] = useState(false);

    useMountEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen(open => !open);
            }
        };

        document.addEventListener('keydown', down);

        return () => {
            document.removeEventListener('keydown', down);
        };
    });

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    const router = useRouter();

    return (
        <>
            <span data-testid="command-menu-ready" className="hidden" />
            <CommandDialog
                open={open}
                onOpenChange={setOpen}
                title={t('title')}
                description={t('description')}
                data-testid="command-dialog"
            >
                <CommandInput placeholder={t('placeholder')} data-testid="command-input" />
                <CommandList>
                    <CommandEmpty>{t('empty')}</CommandEmpty>

                    <CommandGroup heading={t('navigation')}>
                        <CommandItem
                            onSelect={() => runCommand(() => router.push('/dashboard/home'))}
                            data-testid="command-item-home"
                        >
                            <Home className="mr-2 h-4 w-4" />
                            <span>{tSidebar('home')}</span>
                        </CommandItem>
                        <CommandItem
                            onSelect={() => runCommand(() => router.push('/dashboard/objectives'))}
                            data-testid="command-item-objectives"
                        >
                            <Target className="mr-2 h-4 w-4" />
                            <span>{tSidebar('objectives')}</span>
                        </CommandItem>
                        <CommandItem
                            onSelect={() => runCommand(() => router.push('/dashboard/invitations'))}
                            data-testid="command-item-invitations"
                        >
                            <Mail className="mr-2 h-4 w-4" />
                            <span>{tSidebar('invitations')}</span>
                        </CommandItem>
                        <CommandItem
                            onSelect={() =>
                                runCommand(() => router.push('/dashboard/organizations'))
                            }
                            data-testid="command-item-organizations"
                        >
                            <Users className="mr-2 h-4 w-4" />
                            <span>{tSidebar('organizations')}</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />
                </CommandList>
            </CommandDialog>
        </>
    );
}
