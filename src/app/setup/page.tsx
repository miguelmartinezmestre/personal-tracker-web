import { redirect } from 'next/navigation';
import { checkPlatformSetUp } from '@/features/setup/server';
import SetupWizard from '@/features/setup/components/setup-wizard';
import { getTranslations } from 'next-intl/server';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Setup', 'title');

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
    const isPlatformSetUp = await checkPlatformSetUp();
    if (isPlatformSetUp) {
        redirect('/');
    }
    const t = await getTranslations('Setup');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <div className="mx-auto max-w-4xl px-4 py-12">
                <div className="mb-8 text-center">
                    <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {t('title')}
                    </h1>
                    <p className="mx-auto max-w-lg text-slate-600 dark:text-slate-400">
                        {t('subtitle')}
                    </p>
                </div>
                <SetupWizard />
            </div>
        </div>
    );
}
