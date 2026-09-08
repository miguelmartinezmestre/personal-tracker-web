import type { Doc, Id } from '@/convex/_generated/dataModel';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';

export type ProgressPoint = { date: number; currentValue: number; objective: number };

export function buildProgressPoints(
    chartUpdates: Pick<Doc<'progressUpdates'>, 'updatedValue' | 'updateDate'>[],
    objectiveDoc:
        { startValue?: number; currentValue: number; targetValue: number } | null | undefined,
    seriesStartValue?: number
): ProgressPoint[] {
    if (!objectiveDoc) {
        return [];
    }
    const sortedUpdates = [...chartUpdates].sort((a, b) => a.updateDate - b.updateDate);
    let current =
        seriesStartValue ??
        objectiveDoc.currentValue -
            sortedUpdates.reduce((sum, point) => sum + point.updatedValue, 0);
    return sortedUpdates.map(update => {
        current += update.updatedValue;
        return {
            date: update.updateDate,
            currentValue: current,
            objective: objectiveDoc.targetValue,
        };
    });
}

export function lastProgressUpdateDate(chartUpdates: Doc<'progressUpdates'>[]): number | null {
    const lastUpdate = [...chartUpdates].sort((a, b) => a.updateDate - b.updateDate).at(-1);
    if (!lastUpdate) {
        return null;
    }
    return lastUpdate.updateDate;
}

export function unitSuffixFromObjective(unit: string | null | undefined): string {
    if (!unit) {
        return '';
    }
    return ` ${unit}`;
}

export function canEditProgressRow(
    authorId: Id<'user'>,
    objectiveDoc: ObjectiveWithCapabilities | null | undefined,
    currentUserId: Id<'user'> | null
): boolean {
    if (!objectiveDoc || !currentUserId) {
        return false;
    }
    if (authorId === currentUserId) {
        return true;
    }
    return objectiveDoc.capabilities.canEditDefinition;
}
