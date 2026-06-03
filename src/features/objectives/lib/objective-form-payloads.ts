import type { Id } from '@/convex/_generated/dataModel';
import type {
    CreateObjective,
    Objective,
    SavedObjectiveForm,
} from '@/features/objectives/schemas/objective';
import { toCategoryId } from '@/features/objectives/lib/objective-category-selection';

export function getObjectiveEditFormValues(objective: Objective): SavedObjectiveForm {
    return {
        _id: objective._id,
        title: objective.title,
        description: objective.description,
        categoryId: objective.categoryId ? String(objective.categoryId) : null,
        targetValue: objective.targetValue,
        currentValue: objective.currentValue,
        startValue: objective.startValue,
        deadline: objective.deadline,
        status: objective.status,
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
        unit: value.unit ?? undefined,
    };
}

export function buildUpdateObjectivePayload(value: SavedObjectiveForm) {
    // categoryId: an id sets the category, null clears it (distinct from "no change").
    return {
        id: value._id as Id<'objectives'>,
        title: value.title,
        description: value.description ?? undefined,
        categoryId: toCategoryId(value.categoryId) ?? null,
        targetValue: value.targetValue,
        deadline: value.deadline ?? undefined,
        unit: value.unit ?? undefined,
    };
}
