'use client';

import { useState } from 'react';
import { useConvexPages } from '@/hooks/use-convex-pages';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import type { FunctionReturnType } from 'convex/server';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';
import { ObjectiveCollaboratorsVisibility } from './objective-collaborators-visibility';
import { ObjectiveCollaboratorsAddForm } from './objective-collaborators-add-form';
import { ObjectiveCollaboratorsList } from './objective-collaborators-list';
import type { CollaboratorRole } from '../lib/collaborator-display';

type ObjectiveCollaboratorsDialogProps = {
    objective: ObjectiveWithCapabilities;
};

export function ObjectiveCollaboratorsDialog({ objective }: ObjectiveCollaboratorsDialogProps) {
    const t = useTranslations('Objectives');
    const common = useTranslations('Common');
    const [open, setOpen] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<CollaboratorRole>('editor');

    type Collaborator = FunctionReturnType<
        typeof api.objectives.getObjectiveCollaboratorsPage
    >['page'][number];
    type Member = FunctionReturnType<
        typeof api.organizations.getOrganizationMembers
    >['page'][number];
    const enabled = open && objective.capabilities.canManageCollaborators;
    const collaboratorsQuery = useConvexPages<Collaborator>(
        objective._id,
        cursor => ({
            ...convexQuery(api.objectives.getObjectiveCollaboratorsPage, {
                objectiveId: objective._id,
                paginationOpts: { cursor, numItems: 50 },
            }),
            enabled,
        }),
        item => item.id
    );
    const membersQuery = useConvexPages<Member>(
        objective.organizationId,
        cursor => ({
            ...convexQuery(api.organizations.getOrganizationMembers, {
                organizationId: objective.organizationId,
                paginationOpts: { cursor, numItems: 50 },
            }),
            enabled,
        }),
        item => item.id
    );

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
        membersQuery.data?.filter(
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
                    {collaboratorsQuery.isError || membersQuery.isError ? (
                        <QueryErrorFallback
                            onRetry={() => {
                                void collaboratorsQuery.refetch();
                                void membersQuery.refetch();
                            }}
                        />
                    ) : null}
                    {objective.capabilities.canSetVisibility ? (
                        <ObjectiveCollaboratorsVisibility
                            visibility={objective.visibility}
                            objectiveId={objective._id}
                            onVisibilityChange={visibility =>
                                setVisibility.mutate({
                                    id: objective._id,
                                    visibility,
                                })
                            }
                        />
                    ) : null}

                    <ObjectiveCollaboratorsAddForm
                        memberOptions={memberOptions}
                        selectedMemberId={selectedMemberId}
                        selectedRole={selectedRole}
                        isPending={addCollaborator.isPending}
                        onMemberChange={setSelectedMemberId}
                        onRoleChange={setSelectedRole}
                        onAdd={(userId, role) =>
                            addCollaborator.mutate({
                                objectiveId: objective._id,
                                userId,
                                role,
                            })
                        }
                    />

                    {membersQuery.hasMore ? (
                        <Button
                            variant="outline"
                            disabled={membersQuery.isFetching}
                            onClick={membersQuery.loadMore}
                        >
                            {common('actions.loadMore')}
                        </Button>
                    ) : null}
                    <ObjectiveCollaboratorsList
                        collaborators={collaborators}
                        canTransfer={objective.capabilities.canTransfer}
                        isRemoving={removeCollaborator.isPending}
                        isTransferring={transferOwnership.isPending}
                        onRoleChange={(collaboratorId, role) =>
                            updateRole.mutate({ collaboratorId, role })
                        }
                        onRemove={collaboratorId => removeCollaborator.mutate({ collaboratorId })}
                        onMakeOwner={newOwnerId =>
                            transferOwnership.mutate({
                                id: objective._id,
                                newOwnerId,
                            })
                        }
                    />
                    {collaboratorsQuery.hasMore ? (
                        <Button
                            variant="outline"
                            disabled={collaboratorsQuery.isFetching}
                            onClick={collaboratorsQuery.loadMore}
                        >
                            {common('actions.loadMore')}
                        </Button>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
