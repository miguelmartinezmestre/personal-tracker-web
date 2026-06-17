'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';
import { OBJECTIVE_VISIBILITY } from '@/convex/utils/constants';

type ObjectiveCollaboratorsDialogProps = {
    objective: ObjectiveWithCapabilities;
};

export function ObjectiveCollaboratorsDialog({ objective }: ObjectiveCollaboratorsDialogProps) {
    const t = useTranslations('Objectives');
    const [open, setOpen] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('editor');

    const collaboratorsQuery = useQuery({
        ...convexQuery(api.objectives.getObjectiveCollaborators, {
            objectiveId: objective._id,
        }),
        enabled: open && objective.capabilities.canManageCollaborators,
    });

    const membersQuery = useQuery({
        ...convexQuery(api.organizations.getOrganizationMembers, {
            organizationId: objective.organizationId,
            paginationOpts: { numItems: 100, cursor: null },
        }),
        enabled: open && objective.capabilities.canManageCollaborators,
    });

    const addCollaborator = useMutation({
        mutationFn: useConvexMutation(api.objectives.addCollaborator),
        onSuccess: () => {
            toast.success(t('collaborators.added'));
            setSelectedMemberId('');
        },
        onError: () => toast.error(t('collaborators.addFailed')),
    });

    const updateRole = useMutation({
        mutationFn: useConvexMutation(api.objectives.updateCollaboratorRole),
        onError: () => toast.error(t('collaborators.updateFailed')),
    });

    const removeCollaborator = useMutation({
        mutationFn: useConvexMutation(api.objectives.removeCollaborator),
        onSuccess: () => toast.success(t('collaborators.removed')),
        onError: () => toast.error(t('collaborators.removeFailed')),
    });

    const setVisibility = useMutation({
        mutationFn: useConvexMutation(api.objectives.setObjectiveVisibility),
        onSuccess: () => toast.success(t('collaborators.visibilityUpdated')),
        onError: () => toast.error(t('collaborators.visibilityUpdateFailed')),
    });

    const transferOwnership = useMutation({
        mutationFn: useConvexMutation(api.objectives.transferObjectiveOwnership),
        onSuccess: () => toast.success(t('collaborators.ownershipTransferred')),
        onError: () => toast.error(t('collaborators.transferFailed')),
    });

    if (!objective.capabilities.canManageCollaborators) {
        return null;
    }

    const collaborators = collaboratorsQuery.data ?? [];
    const memberOptions =
        membersQuery.data?.page.filter(
            member =>
                member.userId !== objective.ownerId &&
                !collaborators.some(collaborator => collaborator.userId === member.userId)
        ) ?? [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="objective-collaborators-open">
                    <Users className="mr-2 h-4 w-4" />
                    {t('collaborators.manage')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('collaborators.title')}</DialogTitle>
                    <DialogDescription>{t('collaborators.description')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {objective.capabilities.canSetVisibility ? (
                        <div className="space-y-2">
                            <Label>{t('visibility.label')}</Label>
                            <Select
                                value={objective.visibility}
                                onValueChange={value =>
                                    setVisibility.mutate({
                                        id: objective._id,
                                        visibility: value as 'private' | 'organization',
                                    })
                                }
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
                    ) : null}

                    <div className="space-y-2">
                        <Label>{t('collaborators.addMember')}</Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                                <SelectTrigger
                                    className="flex-1"
                                    data-testid="collaborator-member-select"
                                >
                                    <SelectValue placeholder={t('collaborators.selectMember')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {memberOptions.map(member => (
                                        <SelectItem key={member.userId} value={member.userId}>
                                            {member.user?.name ??
                                                member.user?.email ??
                                                member.userId}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={selectedRole}
                                onValueChange={value =>
                                    setSelectedRole(value as 'editor' | 'viewer')
                                }
                            >
                                <SelectTrigger
                                    className="sm:w-32"
                                    data-testid="collaborator-add-role-select"
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
                                data-testid="collaborator-add-button"
                                disabled={!selectedMemberId || addCollaborator.isPending}
                                onClick={() =>
                                    addCollaborator.mutate({
                                        objectiveId: objective._id,
                                        userId: selectedMemberId as Id<'user'>,
                                        role: selectedRole,
                                    })
                                }
                            >
                                {t('collaborators.add')}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('collaborators.current')}</Label>
                        {collaborators.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('collaborators.empty')}
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {collaborators.map(collaborator => (
                                    <li
                                        key={collaborator.id}
                                        data-testid="collaborator-row"
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2"
                                    >
                                        <span className="text-sm">
                                            {collaborator.user?.name ??
                                                collaborator.user?.email ??
                                                collaborator.userId}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={collaborator.role}
                                                onValueChange={value =>
                                                    updateRole.mutate({
                                                        collaboratorId: collaborator.id,
                                                        role: value as 'editor' | 'viewer',
                                                    })
                                                }
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
                                                disabled={removeCollaborator.isPending}
                                                onClick={() =>
                                                    removeCollaborator.mutate({
                                                        collaboratorId: collaborator.id,
                                                    })
                                                }
                                            >
                                                {t('collaborators.remove')}
                                            </Button>
                                            {objective.capabilities.canTransfer ? (
                                                <Button
                                                    data-testid="collaborator-make-owner-button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={transferOwnership.isPending}
                                                    onClick={() =>
                                                        transferOwnership.mutate({
                                                            id: objective._id,
                                                            newOwnerId: collaborator.userId,
                                                        })
                                                    }
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
