'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SETUP_STEPS } from '../hooks/use-setup-wizard';

interface SetupProgressProps {
    currentStep: number;
    isStepValid: (step: (typeof SETUP_STEPS)[number]) => boolean;
}

export default function SetupProgress({ currentStep, isStepValid }: SetupProgressProps) {
    const t = useTranslations('Setup');

    const stepLabels = SETUP_STEPS.map(step => t(`steps.${step}`));

    return (
        <nav aria-label="Setup progress" className="mb-8">
            <ol className="flex items-center justify-between">
                {stepLabels.map((label, index) => {
                    const stepName = SETUP_STEPS[index]!;
                    const isCompleted = index < currentStep && isStepValid(stepName);
                    const isCurrent = index === currentStep;

                    return (
                        <li key={stepName} className="flex flex-1 items-center">
                            <div className="flex flex-col items-center gap-1.5">
                                <div
                                    className={cn(
                                        'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                                        isCompleted &&
                                            'border-primary bg-primary text-primary-foreground',
                                        isCurrent && 'border-primary bg-background text-primary',
                                        !isCompleted &&
                                            !isCurrent &&
                                            'border-muted-foreground/30 bg-background text-muted-foreground/50'
                                    )}
                                >
                                    {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                                </div>
                                <span
                                    className={cn(
                                        'text-xs text-center max-w-[80px]',
                                        isCurrent
                                            ? 'font-medium text-foreground'
                                            : 'text-muted-foreground'
                                    )}
                                >
                                    {label}
                                </span>
                            </div>
                            {index < stepLabels.length - 1 && (
                                <div
                                    className={cn(
                                        'mx-2 h-0.5 flex-1 transition-colors',
                                        index < currentStep
                                            ? 'bg-primary'
                                            : 'bg-muted-foreground/20'
                                    )}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
