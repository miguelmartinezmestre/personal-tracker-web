'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import StepPlatformConfig from './step-platform-config';
import StepAdminAccount from './step-admin-account';
import StepOrganization from './step-organization';
import StepCategories from './step-categories';
import StepRegistrationPolicy from './step-registration-policy';
import StepSummary from './step-summary';
import type { SetupData, SetupStep } from '../hooks/use-setup-wizard';

type SetupStepUpdater = {
    (step: 'platform', data: Partial<SetupData['platform']>): void;
    (step: 'admin', data: Partial<SetupData['admin']>): void;
    (step: 'organization', data: Partial<SetupData['organization']>): void;
    (step: 'categories', data: SetupData['categories']): void;
    (step: 'registration', data: Partial<SetupData['registration']>): void;
};

type SetupStepContentProps = {
    currentStepName: SetupStep;
    data: SetupData;
    updateStepData: SetupStepUpdater;
};

export function SetupStepContent({ currentStepName, data, updateStepData }: SetupStepContentProps) {
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
}

type SetupWizardActionsProps = {
    isFirstStep: boolean;
    isLastStep: boolean;
    canProceed: boolean;
    isSubmitting: boolean;
    onBack: () => void;
    onNext: () => void;
    onComplete: () => void;
};

export function SetupWizardActions({
    isFirstStep,
    isLastStep,
    canProceed,
    isSubmitting,
    onBack,
    onNext,
    onComplete,
}: SetupWizardActionsProps) {
    const t = useTranslations('Setup');

    let action: React.ReactNode;

    if (isLastStep) {
        let completeLabel: React.ReactNode;

        if (isSubmitting) {
            completeLabel = (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('navigation.completing')}
                </>
            );
        } else {
            completeLabel = t('navigation.complete');
        }

        action = (
            <Button
                onClick={onComplete}
                disabled={!canProceed || isSubmitting}
                data-testid="setup-complete-button"
            >
                {completeLabel}
            </Button>
        );
    } else {
        action = (
            <Button onClick={onNext} disabled={!canProceed} data-testid="setup-next-button">
                {t('navigation.next')}
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        );
    }

    return (
        <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={onBack} disabled={isFirstStep || isSubmitting}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('navigation.back')}
            </Button>

            {action}
        </div>
    );
}
