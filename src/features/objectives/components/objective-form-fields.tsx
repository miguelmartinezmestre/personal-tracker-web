'use client';

import { useTranslations } from 'next-intl';
import type { CategoryOption } from '@/features/objectives/lib/objective-category-selection';
import { ObjectiveTextFields } from './objective-text-fields';
import { ObjectiveCategoryField } from './objective-category-field';
import { ObjectiveMetricsFields } from './objective-metrics-fields';
import { ObjectiveVisibilityAndDeadlineFields } from './objective-visibility-deadline-fields';

type ObjectiveFormFieldsProps = {
    mode: 'create' | 'edit';
    categoryOptions: CategoryOption[];
    categoriesLoading: boolean;
};

function getTestId(mode: ObjectiveFormFieldsProps['mode'], name: string) {
    return mode === 'create' ? `objective-${name}` : `objective-edit-${name}`;
}

export function ObjectiveFormFields({
    mode,
    categoryOptions,
    categoriesLoading,
}: ObjectiveFormFieldsProps) {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const titleLabel = mode === 'create' ? t('smartForm.fields.titleRequired') : t('title');
    const descriptionLabel =
        mode === 'create' ? t('smartForm.fields.description') : t('description');
    const categoryLabel = mode === 'create' ? t('smartForm.fields.category') : t('category');
    const targetValueLabel =
        mode === 'create' ? t('smartForm.fields.targetValueRequired') : t('targetValue');
    const unitLabel = mode === 'create' ? t('smartForm.fields.unit') : t('unit');
    const unitPlaceholder = mode === 'create' ? t('unitExample') : t('enterUnit');
    const deadlineLabel = mode === 'create' ? t('smartForm.fields.deadline') : t('deadline');

    return (
        <>
            <ObjectiveTextFields
                titleLabel={titleLabel}
                descriptionLabel={descriptionLabel}
                titlePlaceholder={t('enterObjectiveTitle')}
                descriptionPlaceholder={t('describeObjectiveInDetail')}
                titleDescription={t('giveYourObjectiveAClearConciseTitle')}
                titleTestId={getTestId(mode, 'title-input')}
                descriptionTestId={getTestId(mode, 'description-input')}
            />
            <ObjectiveCategoryField
                label={categoryLabel}
                placeholder={t('selectACategory')}
                loadingLabel={tCommon('loading')}
                emptyLabel={t('categories.emptyTitle')}
                testId={getTestId(mode, 'category-select')}
                categoryOptions={categoryOptions}
                categoriesLoading={categoriesLoading}
            />
            <ObjectiveMetricsFields
                mode={mode}
                targetValueLabel={targetValueLabel}
                unitLabel={unitLabel}
                unitPlaceholder={unitPlaceholder}
                initialValueLabel={t('initialValue')}
                initialValueDescription={t('initialValueDescription')}
                targetTestId={getTestId(mode, 'target-input')}
                startTestId={getTestId(mode, 'start-input')}
                unitTestId={getTestId(mode, 'unit-input')}
            />
            <ObjectiveVisibilityAndDeadlineFields
                mode={mode}
                visibilityLabel={t('visibility.label')}
                visibilityDescription={t('visibility.description')}
                deadlineLabel={deadlineLabel}
                visibilityTestId={getTestId(mode, 'visibility-select')}
                deadlineTestId={getTestId(mode, 'deadline-button')}
            />
        </>
    );
}
