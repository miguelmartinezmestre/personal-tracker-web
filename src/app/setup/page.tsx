import { redirect } from 'next/navigation';
import { isPlatformSetUp } from '@/features/setup/server';
import SetupWizard from '@/features/setup/components/setup-wizard';
import { getTranslations } from 'next-intl/server';
import { translatedPageTitle } from '@/lib/page-metadata';
import { CATEGORY_PROPOSAL } from '@/features/setup/lib/default-categories';

export const generateMetadata = translatedPageTitle('Setup', 'title');

export const dynamic = 'force-dynamic';

// The proposal is in the platform's default language, which may differ from the wizard's.
async function categoryProposal(locale: 'en' | 'es') {
    const t = await getTranslations({ locale, namespace: 'Categories.defaults' });

    return CATEGORY_PROPOSAL.map(({ key, ...category }) => ({ ...category, name: t(key) }));
}

export default async function SetupPage() {
    if (await isPlatformSetUp()) {
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
                <SetupWizard
                    categoryProposals={{
                        en: await categoryProposal('en'),
                        es: await categoryProposal('es'),
                    }}
                />
            </div>
        </div>
    );
}
