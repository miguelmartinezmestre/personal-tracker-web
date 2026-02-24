'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Users, UserPlus, X } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { Badge } from '@/components/ui/badge';

interface CollaboratorManagementDialogProps {
    objectiveId: Id<'objectives'>;
    ownerId: string;
    collaborators: string[];
}

export function CollaboratorManagementDialog({
    objectiveId,
    ownerId,
    collaborators,
}: CollaboratorManagementDialogProps) {
    const t = useTranslations('Objectives.collaboration');
    const [open, setOpen] = React.useState(false);
    const [selectedMember, setSelectedMember] = React.useState<string>('');
    const queryClient = useQueryClient();

    const { data: members } = useQuery(convexQuery(api.objectives.getOrganizationMembers, {}));

    const invalidateCollaboratorQueries = () => {
        queryClient.invalidateQueries({
            queryKey: [api.objectives.getObjectivesByUser],
        });
        queryClient.invalidateQueries({
            queryKey: [api.objectives.getSharedObjectives],
        });
        queryClient.invalidateQueries({
            queryKey: [api.objectives.getObjectiveById],
        });
    };

    const addCollaborator = useMutation({
        mutationFn: useConvexMutation(api.objectives.addCollaborator),
        onSuccess: () => {
            toast.success(t('toast.addSuccess'));
            invalidateCollaboratorQueries();
            setSelectedMember('');
        },
        onError: () => {
            toast.error(t('toast.addFailed'));
        },
    });

    const removeCollaborator = useMutation({
        mutationFn: useConvexMutation(api.objectives.removeCollaborator),
        onSuccess: () => {
            toast.success(t('toast.removeSuccess'));
            invalidateCollaboratorQueries();
        },
        onError: () => {
            toast.error(t('toast.removeFailed'));
        },
    });

    const handleAdd = () => {
        if (!selectedMember) return;
        addCollaborator.mutate({
            objectiveId,
            collaboratorId: selectedMember,
        });
    };

    const handleRemove = (collaboratorId: string) => {
        removeCollaborator.mutate({
            objectiveId,
            collaboratorId,
        });
    };

    // Filter out the owner and existing collaborators from the available members list
    const availableMembers = React.useMemo(() => {
        if (!members) return [];
        return members.filter(m => m.userId !== ownerId && !collaborators.includes(m.userId));
    }, [members, ownerId, collaborators]);

    // Build a lookup map for member details
    const memberMap = React.useMemo(() => {
        const map = new Map<string, { name?: string; email?: string }>();
        if (members) {
            for (const m of members) {
                map.set(m.userId, { name: m.name ?? undefined, email: m.email ?? undefined });
            }
        }
        return map;
    }, [members]);

    const getMemberLabel = (userId: string) => {
        const member = memberMap.get(userId);
        if (member?.name) return member.name;
        if (member?.email) return member.email;
        return userId;
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="collaborator-manage-button">
                    <Users className="mr-2 h-4 w-4" />
                    {t('manageCollaborators')}
                    {collaborators.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                            {collaborators.length}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Add collaborator section */}
                    <div className="flex items-center gap-2">
                        <Select value={selectedMember} onValueChange={setSelectedMember}>
                            <SelectTrigger className="flex-1" data-testid="collaborator-select">
                                <SelectValue placeholder={t('selectMember')} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableMembers.length === 0 ? (
                                    <SelectItem value="_none" disabled>
                                        {t('noMembers')}
                                    </SelectItem>
                                ) : (
                                    availableMembers.map(member => (
                                        <SelectItem key={member.userId} value={member.userId}>
                                            {member.name ?? member.email ?? member.userId}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={handleAdd}
                            disabled={!selectedMember || addCollaborator.isPending}
                            size="sm"
                            data-testid="collaborator-add-button"
                        >
                            <UserPlus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Current collaborators list */}
                    <div className="space-y-2">
                        {/* Owner */}
                        <div className="flex items-center justify-between rounded-md border p-2">
                            <span className="text-sm font-medium">{getMemberLabel(ownerId)}</span>
                            <Badge variant="default">{t('owner')}</Badge>
                        </div>

                        {/* Collaborators */}
                        {collaborators.map(collab => (
                            <div
                                key={collab}
                                className="flex items-center justify-between rounded-md border p-2"
                            >
                                <span className="text-sm">{getMemberLabel(collab)}</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{t('collaborator')}</Badge>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemove(collab)}
                                        disabled={removeCollaborator.isPending}
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                        data-testid={`collaborator-remove-${collab}`}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
