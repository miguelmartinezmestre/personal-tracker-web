'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { objectivePace, type ObjectivePace } from '@/features/objectives/lib/dates';

const PACE_BADGE: Record<
    ObjectivePace,
    { variant: 'outline' | 'destructive'; className?: string }
> = {
    onTrack: { variant: 'outline' },
    atRisk: {
        variant: 'outline',
        className: 'border-amber-500 text-amber-700 dark:text-amber-400',
    },
    overdue: { variant: 'destructive' },
};

export default function ObjectivePaceBadge({
    objective,
}: {
    objective: Parameters<typeof objectivePace>[0];
}) {
    const t = useTranslations('Objectives.statusOptions');
    const pace = objectivePace(objective);

    if (!pace) {
        return null;
    }

    return (
        <Badge {...PACE_BADGE[pace]} data-testid="objective-pace" data-pace={pace}>
            {t(pace)}
        </Badge>
    );
}
