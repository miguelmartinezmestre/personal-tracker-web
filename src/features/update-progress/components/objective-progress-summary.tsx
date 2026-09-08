'use client';
import { useTranslations } from 'next-intl';
type ObjectiveProgressSummaryProps = {
    title: string;
    description: string;
    unitLabel: string;
    targetValue: number | undefined;
    currentValue: number | undefined;
};
export function ObjectiveProgressSummary({
    title,
    description,
    unitLabel,
    targetValue,
    currentValue,
}: ObjectiveProgressSummaryProps) {
    const tObjectives = useTranslations('Objectives');
    const formatValue = (value: number) => (unitLabel ? `${value} ${unitLabel}` : `${value}`);
    const hasMetrics = typeof targetValue === 'number' || typeof currentValue === 'number';
    if (!title && !description && !hasMetrics) {
        return null;
    }
    return (
        <>
            {title ? <p className="text-lg font-semibold text-foreground">{title}</p> : null}
            {description || hasMetrics ? (
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {description ? (
                        <p>
                            <span className="font-medium text-foreground">
                                {tObjectives('tableDescription')}:
                            </span>{' '}
                            {description}
                        </p>
                    ) : null}
                    {hasMetrics ? (
                        <div className="flex flex-wrap gap-4">
                            {typeof targetValue === 'number' ? (
                                <span>
                                    <span className="font-medium text-foreground">
                                        {tObjectives('targetValue')}:
                                    </span>{' '}
                                    {formatValue(targetValue)}
                                </span>
                            ) : null}
                            {typeof currentValue === 'number' ? (
                                <span>
                                    <span className="font-medium text-foreground">
                                        {tObjectives('currentValue')}:
                                    </span>{' '}
                                    {formatValue(currentValue)}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
