import type { Id } from '@/convex/_generated/dataModel';
import type {
    CreateObjective,
    Objective,
    SavedObjectiveForm,
} from '@/features/objectives/schemas/objective';
import {
    encodeMissingCategorySelection,
    isMissingCategorySelection,
    toCategoryId,
} from '@/features/objectives/lib/objective-category-selection';

export function getObjectiveEditFormValues(objective: Objective): SavedObjectiveForm {
    const categoryId = objective.categoryId
        ? String(objective.categoryId)
        : objective.category
          ? encodeMissingCategorySelection(objective.category)
          : null;

    return {
        _id: objective._id,
        title: objective.title,
        description: objective.description,
        categoryId,
        targetValue: objective.targetValue,
        currentValue: objective.currentValue,
        startValue: objective.startValue,
        deadline: objective.deadline,
        status: objective.status,
        scope: objective.scope,
        unit: objective.unit,
    };
}

export function buildCreateObjectivePayload(value: CreateObjective) {
    return {
        title: value.title,
        description: value.description ?? undefined,
        categoryId: toCategoryId(value.categoryId),
        targetValue: Number(value.targetValue),
        startValue: 0,
        currentValue: 0,
        deadline: value.deadline ?? undefined,
        scope: value.scope,
        unit: value.unit ?? undefined,
    };
}

export function buildUpdateObjectivePayload(
    value: SavedObjectiveForm,
    getCategoryNameForSelection: (selection: string | null | undefined) => string | undefined
) {
    const categoryId = toCategoryId(value.categoryId);
    const updatePayload: {
        id: Id<'objectives'>;
        title: string;
        description?: string;
        category?: string;
        categoryId?: Id<'categories'>;
        targetValue: number;
        deadline?: number;
        unit?: string;
        scope: 'personal' | 'organization';
    } = {
        id: value._id as Id<'objectives'>,
        title: value.title,
        description: value.description ?? undefined,
        targetValue: value.targetValue,
        deadline: value.deadline ?? undefined,
        unit: value.unit ?? undefined,
        scope: value.scope,
    };

    if (categoryId) {
        updatePayload.categoryId = categoryId;
    } else if (isMissingCategorySelection(value.categoryId)) {
        updatePayload.category = getCategoryNameForSelection(value.categoryId) ?? '';
    } else {
        updatePayload.category = '';
    }

    return updatePayload;
}
