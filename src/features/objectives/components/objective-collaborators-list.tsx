'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Id } from '@/convex/_generated/dataModel';
import {
    formatCollaboratorIdentity,
    isCollaboratorRole,
    type CollaboratorRole,
} from '../lib/collaborator-display';

type CollaboratorRow = {
    id: Id<'objectiveCollaborators'>;
    userId: Id<'user'>;
    role: CollaboratorRole;
    user?: { name?: string | null; email?: string | null } | null;
};

type ObjectiveCollaboratorsListProps = {
    collaborators: CollaboratorRow[];
    canTransfer: boolean;
    isRemoving: boolean;
    isTransferring: boolean;
    onRoleChange: (collaboratorId: Id<'objectiveCollaborators'>, role: CollaboratorRole) => void;
    onRemove: (collaboratorId: Id<'objectiveCollaborators'>) => void;
    onMakeOwner: (userId: Id<'user'>) => void;
};

export function ObjectiveCollaboratorsList({
    collaborators,
    canTransfer,
    isRemoving,
    isTransferring,
    onRoleChange,
    onRemove,
    onMakeOwner,
}: ObjectiveCollaboratorsListProps) {
    const t = useTranslations('Objectives');

    return (
        <div className="space-y-2">
            <Label>{t('collaborators.current')}</Label>
            {collaborators.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('collaborators.empty')}</p>
            ) : (
                <ul className="space-y-2">
                    {collaborators.map(collaborator => (
                        <li
                            key={collaborator.id}
                            data-testid="collaborator-row"
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2"
                        >
                            <span className="text-sm">
                                {formatCollaboratorIdentity(collaborator.user, collaborator.userId)}
                            </span>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={collaborator.role}
                                    onValueChange={value => {
                                        if (isCollaboratorRole(value)) {
                                            onRoleChange(collaborator.id, value);
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        className="w-28"
                                        data-testid="collaborator-row-role-select"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="editor">
                                            {t('collaborators.roles.editor')}
                                        </SelectItem>
                                        <SelectItem value="viewer">
                                            {t('collaborators.roles.viewer')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    data-testid="collaborator-remove-button"
                                    variant="destructive"
                                    size="sm"
                                    disabled={isRemoving}
                                    onClick={() => onRemove(collaborator.id)}
                                >
                                    {t('collaborators.remove')}
                                </Button>
                                {canTransfer ? (
                                    <Button
                                        data-testid="collaborator-make-owner-button"
                                        variant="outline"
                                        size="sm"
                                        disabled={isTransferring}
                                        onClick={() => onMakeOwner(collaborator.userId)}
                                    >
                                        {t('collaborators.makeOwner')}
                                    </Button>
                                ) : null}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
