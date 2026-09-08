'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { OBJECTIVE_VISIBILITY } from '@/convex/utils/constants';
import type { Id } from '@/convex/_generated/dataModel';

type ObjectiveVisibility = (typeof OBJECTIVE_VISIBILITY)[keyof typeof OBJECTIVE_VISIBILITY];

function isObjectiveVisibility(value: string): value is ObjectiveVisibility {
    return value === OBJECTIVE_VISIBILITY.PRIVATE || value === OBJECTIVE_VISIBILITY.ORGANIZATION;
}

type ObjectiveCollaboratorsVisibilityProps = {
    visibility: ObjectiveVisibility;
    objectiveId: Id<'objectives'>;
    onVisibilityChange: (visibility: ObjectiveVisibility) => void;
};

export function ObjectiveCollaboratorsVisibility({
    visibility,
    onVisibilityChange,
}: ObjectiveCollaboratorsVisibilityProps) {
    const t = useTranslations('Objectives');

    return (
        <div className="space-y-2">
            <Label>{t('visibility.label')}</Label>
            <Select
                value={visibility}
                onValueChange={value => {
                    if (isObjectiveVisibility(value)) {
                        onVisibilityChange(value);
                    }
                }}
            >
                <SelectTrigger data-testid="collaborator-visibility-select">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={OBJECTIVE_VISIBILITY.PRIVATE}>
                        {t('visibility.private')}
                    </SelectItem>
                    <SelectItem value={OBJECTIVE_VISIBILITY.ORGANIZATION}>
                        {t('visibility.organization')}
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
