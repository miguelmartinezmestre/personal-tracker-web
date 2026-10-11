'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
    organizationSchema,
    savedOrganizationSchema,
} from '@/features/organizations/schemas/organization';

export function useOrganizationFormSchema() {
    const t = useTranslations('Organizations.validation');
    return useMemo(() => organizationSchema(key => t(key)), [t]);
}

export function useSavedOrganizationFormSchema() {
    const t = useTranslations('Organizations.validation');
    return useMemo(() => savedOrganizationSchema(key => t(key)), [t]);
}
