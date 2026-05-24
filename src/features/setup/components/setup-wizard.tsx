'use client';

import { useState, useMemo } from 'react';

async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: { maxRetries: number; baseDelayMs: number }
): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < options.maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            const delay = options.baseDelayMs * Math.pow(2, i);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/client';
import { useSetupWizard } from '../hooks/use-setup-wizard';
import { getMessageOrFallback, getErrorMessage, emptyToUndefined } from '@/lib/error-utils';
import SetupProgress from './setup-progress';
import StepPlatformConfig from './step-platform-config';
import StepAdminAccount from './step-admin-account';
import StepOrganization from './step-organization';
import StepCategories from './step-categories';
import StepRegistrationPolicy from './step-registration-policy';
import StepSummary from './step-summary';

export default function SetupWizard() {
    const router = useRouter();
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
    } = useSetupWizard();

    const { mutateAsync: completeSetup } = useMutation({
        mutationFn: useConvexMutation(api.setup.completeSetup),
    });

    const canProceed = isStepValid(currentStepName);

    async function handleComplete() {
        setError('');
        setIsSubmitting(true);

        const signUpFailedMsg = t('errors.signUpFailed');
        const setupFailedMsg = t('errors.setupFailed');

        try {
            const signUpResult = await authClient.signUp.email({
                name: data.admin.username,
                email: data.admin.email,
                password: data.admin.password,
            });

            if (signUpResult.error) {
                setError(getMessageOrFallback(signUpResult.error.message, signUpFailedMsg));
                setIsSubmitting(false);
                return;
            }

            const result = await retryWithBackoff(
                () =>
                    completeSetup({
                        platformName: data.platform.platformName,
                        defaultLanguage: data.platform.defaultLanguage,
                        registrationPolicy: data.registration.policy,
                        organizationName: data.organization.name,
                        organizationLogo: emptyToUndefined(data.organization.logo),
                        categories: data.categories.map(category => ({
                            name: category.name,
                            color: category.color,
                            icon: category.icon,
                        })),
                    }),
                { maxRetries: 6, baseDelayMs: 500 }
            );

            if (result.organizationId) {
                await authClient.organization.setActive({
                    organizationId: result.organizationId,
                });
            }

            router.push('/dashboard/home');
        } catch (error: unknown) {
            setError(getErrorMessage(error, setupFailedMsg));
            setIsSubmitting(false);
        }
    }

    const stepContent = useMemo(() => {
        switch (currentStepName) {
            case 'platform':
                return (
                    <StepPlatformConfig
                        data={data.platform}
                        onChange={stepData => updateStepData('platform', stepData)}
                    />
                );
            case 'admin':
                return (
                    <StepAdminAccount
                        data={data.admin}
                        onChange={stepData => updateStepData('admin', stepData)}
                    />
                );
            case 'organization':
                return (
                    <StepOrganization
                        data={data.organization}
                        onChange={stepData => updateStepData('organization', stepData)}
                    />
                );
            case 'categories':
                return (
                    <StepCategories
                        data={data.categories}
                        onChange={stepData => updateStepData('categories', stepData)}
                    />
                );
            case 'registration':
                return (
                    <StepRegistrationPolicy
                        data={data.registration}
                        onChange={stepData => updateStepData('registration', stepData)}
                    />
                );
            case 'summary':
                return <StepSummary data={data} />;
        }
    }, [currentStepName, data, updateStepData]);

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
            <div className="mb-6 text-center">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
            </div>

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

                    {stepContent}

                    <div className="mt-8 flex justify-between">
                        <Button
                            variant="outline"
                            onClick={prevStep}
                            disabled={isFirstStep || isSubmitting}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('navigation.back')}
                        </Button>

                        {isLastStep ? (
                            <Button
                                onClick={handleComplete}
                                disabled={!canProceed || isSubmitting}
                                data-testid="setup-complete-button"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('navigation.completing')}
                                    </>
                                ) : (
                                    t('navigation.complete')
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={nextStep}
                                disabled={!canProceed}
                                data-testid="setup-next-button"
                            >
                                {t('navigation.next')}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <p className="mt-4 text-center text-xs text-muted-foreground">
                {t('footer', { step: currentStep + 1, total: totalSteps })}
            </p>
        </div>
    );
}
