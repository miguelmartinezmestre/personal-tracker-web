'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/client';
import { convex } from '@/platform/convex/providers/convex-query-client';
import { useSetupWizard, type CategoryProposals } from '../hooks/use-setup-wizard';
import { resolveErrorMessage } from '@/lib/error-messages';
import SetupProgress from './setup-progress';
import { createOrResumeSetupAccount } from '../lib/setup-account';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { SETUP_SECRET_HEADER } from '@/convex/features/setup/secret';
import { SetupStepContent, SetupWizardActions } from './setup-step-content';

export default function SetupWizard({
    categoryProposals,
}: {
    categoryProposals: CategoryProposals;
}) {
    const router = useRouter();
    const errorLocale = useLocale() === 'es' ? 'es' : 'en';
    const t = useTranslations('Setup');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        currentStep,
        currentStepName,
        data,
        totalSteps,
        nextStep,
        prevStep,
        updateStepData,
        isStepValid,
        isFirstStep,
        isLastStep,
    } = useSetupWizard(categoryProposals);

    const { mutateAsync: completeSetup } = useMutation({
        mutationFn: useConvexMutation(api.setup.completeSetup),
    });

    const canProceed = isStepValid(currentStepName);

    async function handleComplete() {
        setError('');
        setIsSubmitting(true);
        const signUpFailedMsg = t('errors.signUpFailed');
        const setupFailedMsg = t('errors.setupFailed');
        let fetchOptions;

        if (data.admin.setupSecret) {
            fetchOptions = {
                headers: {
                    [SETUP_SECRET_HEADER]: data.admin.setupSecret,
                },
            };
        } else {
            fetchOptions = undefined;
        }

        try {
            const signUpError = await createOrResumeSetupAccount(
                authClient,
                data.admin,
                fetchOptions
            );

            if (signUpError) {
                setError(signUpError.message || signUpFailedMsg);
                setIsSubmitting(false);

                return;
            }

            const tokenResult = await authClient.convex.token({
                fetchOptions: { throw: false },
            });

            const token = tokenResult.data?.token;

            if (!token) {
                throw new Error('User not found');
            }

            convex.setAuth(() => Promise.resolve(token));

            const setupResult = await completeSetup({
                platformName: data.platform.platformName,
                defaultLanguage: data.platform.defaultLanguage,
                registrationPolicy: data.registration.policy,
                organizationName: data.organization.name,
                organizationLogo: data.organization.logo || undefined,
                categories: data.categories.map(category => ({
                    name: category.name,
                    color: category.color,
                    icon: category.icon,
                })),
            });

            if (setupResult.organizationId) {
                const activeOrganizationResult = await authClient.organization.setActive({
                    organizationId: setupResult.organizationId,
                });

                throwIfAuthClientError(activeOrganizationResult);
            }

            document.cookie = `locale=${data.platform.defaultLanguage};path=/;max-age=31536000;SameSite=Lax`;
            router.push('/dashboard/home');
        } catch (caughtError) {
            setError(resolveErrorMessage(caughtError, errorLocale, setupFailedMsg));
            setIsSubmitting(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
            <SetupProgress currentStep={currentStep} isStepValid={isStepValid} />

            <Card>
                <CardContent className="pt-6">
                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('errors.title')}</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <SetupStepContent
                        currentStepName={currentStepName}
                        data={data}
                        updateStepData={updateStepData}
                    />

                    <SetupWizardActions
                        isFirstStep={isFirstStep}
                        isLastStep={isLastStep}
                        canProceed={canProceed}
                        isSubmitting={isSubmitting}
                        onBack={prevStep}
                        onNext={nextStep}
                        onComplete={() => {
                            void handleComplete();
                        }}
                    />
                </CardContent>
            </Card>

            <p className="mt-4 text-center text-xs text-muted-foreground">
                {t('footer', { step: currentStep + 1, total: totalSteps })}
            </p>
        </div>
    );
}
