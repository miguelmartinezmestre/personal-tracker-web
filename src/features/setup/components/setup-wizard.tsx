'use client';

import { useState } from 'react';

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
import { convex } from '@/platform/convex/providers/convex-query-client';
import { useSetupWizard } from '../hooks/use-setup-wizard';
import { getMessageOrFallback, getErrorMessage } from '@/lib/error-utils';
import SetupProgress from './setup-progress';
import StepPlatformConfig from './step-platform-config';
import StepAdminAccount from './step-admin-account';
import StepOrganization from './step-organization';
import StepCategories from './step-categories';
import StepRegistrationPolicy from './step-registration-policy';
import StepSummary from './step-summary';
import { ErrorContext } from 'better-auth/client';
import { setLocaleCookie } from '@/lib/locale-cookie';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { SETUP_SECRET_HEADER } from '@shared/auth-security';

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
            await authClient.signUp.email(
                {
                    name: data.admin.username,
                    email: data.admin.email,
                    password: data.admin.password,
                    fetchOptions: data.admin.setupSecret
                        ? {
                              headers: {
                                  [SETUP_SECRET_HEADER]: data.admin.setupSecret,
                              },
                          }
                        : undefined,
                },
                {
                    onSuccess: async () => {
                        const tokenResult = await authClient.convex.token({
                            fetchOptions: { throw: false },
                        });
                        const token = tokenResult.data?.token;
                        if (!token) {
                            throw new Error('User not found');
                        }

                        convex.setAuth(async () => token);

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
                            const activeOrganizationResult =
                                await authClient.organization.setActive({
                                    organizationId: setupResult.organizationId,
                                });
                            throwIfAuthClientError(activeOrganizationResult);
                        }

                        setLocaleCookie(data.platform.defaultLanguage);

                        router.push('/dashboard/home');
                    },
                    onError: (error: ErrorContext) => {
                        setError(getMessageOrFallback(error.error.message, signUpFailedMsg));
                        setIsSubmitting(false);
                    },
                }
            );
        } catch (error: unknown) {
            setError(getErrorMessage(error, setupFailedMsg));
            setIsSubmitting(false);
        }
    }

    let stepContent;
    switch (currentStepName) {
        case 'platform':
            stepContent = (
                <StepPlatformConfig
                    data={data.platform}
                    onChange={stepData => updateStepData('platform', stepData)}
                />
            );
            break;
        case 'admin':
            stepContent = (
                <StepAdminAccount
                    data={data.admin}
                    onChange={stepData => updateStepData('admin', stepData)}
                />
            );
            break;
        case 'organization':
            stepContent = (
                <StepOrganization
                    data={data.organization}
                    onChange={stepData => updateStepData('organization', stepData)}
                />
            );
            break;
        case 'categories':
            stepContent = (
                <StepCategories
                    data={data.categories}
                    onChange={stepData => updateStepData('categories', stepData)}
                />
            );
            break;
        case 'registration':
            stepContent = (
                <StepRegistrationPolicy
                    data={data.registration}
                    onChange={stepData => updateStepData('registration', stepData)}
                />
            );
            break;
        case 'summary':
            stepContent = <StepSummary data={data} />;
            break;
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
