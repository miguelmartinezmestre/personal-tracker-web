'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { objectiveFormSchema, progressFormSchema } from '@/features/objectives/schemas/objective';

export function useObjectiveFormSchema(keptDeadline?: string) {
    const t = useTranslations('Objectives.validation');
    return useMemo(() => objectiveFormSchema(key => t(key), keptDeadline), [t, keptDeadline]);
}

export function useProgressFormSchema() {
    const t = useTranslations('UpdateProgress.validation');
    return useMemo(() => progressFormSchema(key => t(key)), [t]);
}
