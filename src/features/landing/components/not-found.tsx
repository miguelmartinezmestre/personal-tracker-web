'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  const t = useTranslations('NotFound');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
      <p className="text-xl mb-8 text-center">{t('subtitle')}</p>
      <div className="flex flex-col gap-4 items-center">
        <p className="text-lg mb-2">{t('whatToDo')}</p>
        <Link href="/" prefetch={false}>
          <button className="w-full md:w-auto">
            <Home className="mr-2 h-4 w-4" /> {t('goHome')}
          </button>
        </Link>
      </div>
    </div>
  );
}
