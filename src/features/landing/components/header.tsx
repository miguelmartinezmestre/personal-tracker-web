'use client';

import { X, Menu } from 'lucide-react';
import NavBar from '@/features/landing/components/navbar';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations('Header');

  return (
    <header className="shadow-sm sticky top-0 z-10 border-b border-gray-200">
      <nav className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <h1>
            <Link href="/" className="text-xl font-bold text-primary" prefetch={false}>
              {t('appName')}
            </Link>
          </h1>
          <button
            className="lg:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? t('aria.closeMenu') : t('aria.openMenu')}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="hidden lg:flex space-x-4">
            <NavBar />
          </div>
        </div>
        {isMenuOpen && (
          <div className="mt-2 py-2 lg:hidden">
            <NavBar />
          </div>
        )}
      </nav>
    </header>
  );
}
