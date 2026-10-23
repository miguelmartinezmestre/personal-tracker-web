'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/convex/_generated/api';
import { CategoryListEditor } from '@/features/categories/components/category-list-editor';
import {
    categoryDraftSchema,
    toCategoryDraft,
    type CategoryDraft,
} from '@/features/categories/schemas/category';
import { usePersonalOrganizationId } from '@/features/organizations/hooks/use-organizations';

/** Right after signing up: the categories of the new personal organization (decision 13). */
export function PersonalCategoriesStep({ onDone }: { onDone: () => void }) {
    const t = useTranslations('Categories.choose');
    const catalog = useQuery(convexQuery(api.platformCategories.listPlatformCategories, {}));
    const personalOrganizationId = usePersonalOrganizationId();
    const [edited, setEdited] = useState<CategoryDraft[] | null>(null);

    const addChosen = useMutation({
        mutationFn: useConvexMutation(api.categories.addChosenCategories),
    });

    const organizationId = personalOrganizationId.data;
    const categories = edited ?? catalog.data?.map(toCategoryDraft) ?? [];
    const isValid = categories.every(category => categoryDraftSchema.safeParse(category).success);
    let content;

    if (catalog.isError || personalOrganizationId.isError) {
        content = (
            <QueryErrorFallback
                onRetry={() => {
                    void catalog.refetch();
                    void personalOrganizationId.refetch();
                }}
            />
        );
    } else if (!catalog.data || !organizationId) {
        content = <Skeleton className="h-64 w-full" />;
    } else {
        content = <CategoryListEditor value={categories} onChange={setEdited} />;
    }

    return (
        <div className="space-y-6" data-testid="register-categories-step">
            <div className="space-y-1">
                <h2 className="text-xl font-semibold">{t('title')}</h2>
                <p className="text-muted-foreground text-sm">{t('description')}</p>
            </div>
            {content}
            <div className="flex justify-end gap-2">
                <Button
                    variant="ghost"
                    onClick={onDone}
                    disabled={addChosen.isPending}
                    data-testid="register-categories-skip"
                >
                    {t('skip')}
                </Button>
                <Button
                    disabled={!organizationId || !isValid || addChosen.isPending}
                    onClick={() => {
                        if (organizationId) {
                            addChosen.mutate({ organizationId, categories }, { onSuccess: onDone });
                        }
                    }}
                    data-testid="register-categories-save"
                >
                    {addChosen.isPending && <Loader2 className="animate-spin" aria-hidden />}
                    {t('save')}
                </Button>
            </div>
        </div>
    );
}
