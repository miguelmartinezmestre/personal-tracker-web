'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { daysUntil } from '@/features/objectives/lib/dates';
import { formatObjectiveDate } from '@/features/objectives/lib/format';

type UpcomingDeadline = {
    id: string;
    title: string;
    deadline: number;
    dueSoonDays: number;
};

export default function UpcomingDeadlines({ objectives }: { objectives: UpcomingDeadline[] }) {
    const t = useTranslations('DashboardHome.deadlines');
    const locale = useLocale();

    if (objectives.length === 0) {
        return <p className="text-muted-foreground text-sm">{t('empty')}</p>;
    }

    return (
        <ul className="divide-y" data-testid="dashboard-upcoming-deadlines">
            {objectives.map(objective => {
                const days = daysUntil(objective.deadline);
                let state: 'overdue' | 'soon' | 'onTime' = 'onTime';

                if (days < 0) {
                    state = 'overdue';
                } else if (days <= objective.dueSoonDays) {
                    state = 'soon';
                }

                return (
                    <li key={objective.id} className="flex items-center gap-3 py-2">
                        <div className="min-w-0 flex-1">
                            <Link
                                href={`/dashboard/objectives/${objective.id}` as Route}
                                prefetch={false}
                                className="block truncate font-medium underline-offset-4 hover:underline"
                            >
                                {objective.title}
                            </Link>
                            <span className="text-muted-foreground text-xs">
                                {formatObjectiveDate(objective.deadline, locale)}
                            </span>
                        </div>
                        <Badge
                            variant={state === 'overdue' ? 'destructive' : 'secondary'}
                            data-testid={`deadline-state-${state}`}
                        >
                            {t(state, { days: Math.abs(days) })}
                        </Badge>
                    </li>
                );
            })}
        </ul>
    );
}
