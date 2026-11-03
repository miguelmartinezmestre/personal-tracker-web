'use client';

import { useLocale, useTranslations } from 'next-intl';

export default function RecentActivity({
    activity,
}: {
    activity: { created: number; updates: number; completed: number };
}) {
    const t = useTranslations('DashboardHome.activity');
    const locale = useLocale();
    const format = new Intl.NumberFormat(locale);

    const items = [
        { key: 'objectivesCreated', value: activity.created },
        { key: 'progressUpdates', value: activity.updates },
        { key: 'objectivesCompleted', value: activity.completed },
    ] as const;

    return (
        <dl className="grid grid-cols-3 gap-2 text-center text-sm" data-testid="dashboard-activity">
            {items.map(item => (
                <div key={item.key}>
                    <dt className="text-muted-foreground">{t(item.key)}</dt>
                    <dd className="text-2xl font-semibold">{format.format(item.value)}</dd>
                </div>
            ))}
        </dl>
    );
}
