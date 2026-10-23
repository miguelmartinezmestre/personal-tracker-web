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
import {
    Award,
    Bell,
    Home,
    Mail,
    MonitorSmartphone,
    Settings,
    Tags,
    Target,
    Users,
} from 'lucide-react';
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
                            onSelect={() => runCommand(() => router.push('/dashboard/categories'))}
                            data-testid="command-item-categories"
                        >
                            <Tags className="mr-2 h-4 w-4" />
                            <span>{tSidebar('categories')}</span>
                        </CommandItem>
                        <CommandItem
                            onSelect={() =>
                                runCommand(() => router.push('/dashboard/achievements'))
                            }
                            data-testid="command-item-achievements"
                        >
                            <Award className="mr-2 h-4 w-4" />
                            <span>{tSidebar('achievements')}</span>
                        </CommandItem>
                        <CommandItem
                            onSelect={() =>
                                runCommand(() => router.push('/dashboard/notifications'))
                            }
                            data-testid="command-item-notifications"
                        >
                            <Bell className="mr-2 h-4 w-4" />
                            <span>{tSidebar('notifications')}</span>
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
                        <CommandItem
                            onSelect={() => runCommand(() => router.push('/dashboard/sessions'))}
                            data-testid="command-item-sessions"
                        >
                            <MonitorSmartphone className="mr-2 h-4 w-4" />
                            <span>{tSidebar('sessions')}</span>
                        </CommandItem>
                        <CommandItem
                            onSelect={() => runCommand(() => router.push('/dashboard/settings'))}
                            data-testid="command-item-settings"
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            <span>{tSidebar('settings')}</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />
                </CommandList>
            </CommandDialog>
        </>
    );
}
