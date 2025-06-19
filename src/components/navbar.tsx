import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-switcher';
import { useEffect, useState } from 'react';
import { isLoggedInAction } from '@/server/actions';
import { LanguageSwitcher } from './language-switcher';

type LinkItem = { name: string; href: string };

type LinkArray = LinkItem[];

const defaultLinks: LinkArray = [
    { name: 'Registrase', href: '/register' },
    { name: 'Iniciar sesión', href: '/login' },
];

export default function NavBar() {
    const [links, setLinks] = useState<LinkArray>(defaultLinks);

    useEffect(() => {
        async function getIsLoggedIn() {
            const isLoggedIn = await isLoggedInAction();
            if (isLoggedIn?.data) {
                setLinks([...links, { name: 'Go to dashboard', href: '/dashboard' }]);
            }
        }
        getIsLoggedIn();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col lg:flex-row lg:space-x-4 space-y-2 lg:space-y-0 items-center">
            {links.map(link => (
                <Link key={link.name} href={link.href} className="text-primary hover:text-gray-700" prefetch={false}>
                    {link.name}
                </Link>
            ))}
            <div className="text-primary hover:text-gray-700">
                <ThemeToggle />
            </div>
            <div className="text-primary hover:text-gray-700">
                <LanguageSwitcher />
            </div>
        </div>
    );
}
