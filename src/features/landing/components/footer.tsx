'use client';

import { useTranslations } from 'next-intl';

export default function Footer() {
    const t = useTranslations('App');

    return (
        <footer className="text-primary border-t border-gray-200">
            <div className="container mx-auto px-4 py-6 ">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <p>
                        &copy; {new Date().getFullYear()} {t('title')}
                    </p>
                    <div className="flex space-x-4">
                    </div>
                </div>
            </div>
        </footer>
    );
}
