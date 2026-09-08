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
type MemberOption = {
    userId: Id<'user'>;
    user?: {
        name?: string | null;
        email?: string | null;
    } | null;
};
type ObjectiveCollaboratorsAddFormProps = {
    memberOptions: MemberOption[];
    selectedMemberId: string;
    selectedRole: CollaboratorRole;
    isPending: boolean;
    onMemberChange: (userId: string) => void;
    onRoleChange: (role: CollaboratorRole) => void;
    onAdd: (userId: Id<'user'>, role: CollaboratorRole) => void;
};
export function ObjectiveCollaboratorsAddForm({
    memberOptions,
    selectedMemberId,
    selectedRole,
    isPending,
    onMemberChange,
    onRoleChange,
    onAdd,
}: ObjectiveCollaboratorsAddFormProps) {
    const t = useTranslations('Objectives');
    return (
        <div className="space-y-2">
            <Label>{t('collaborators.addMember')}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={selectedMemberId} onValueChange={onMemberChange}>
                    <SelectTrigger className="flex-1" data-testid="collaborator-member-select">
                        <SelectValue placeholder={t('collaborators.selectMember')} />
                    </SelectTrigger>
                    <SelectContent>
                        {memberOptions.map(member => (
                            <SelectItem key={member.userId} value={member.userId}>
                                {formatCollaboratorIdentity(member.user, member.userId)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={selectedRole}
                    onValueChange={value => {
                        if (isCollaboratorRole(value)) {
                            onRoleChange(value);
                        }
                    }}
                >
                    <SelectTrigger className="sm:w-32" data-testid="collaborator-add-role-select">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="editor">{t('collaborators.roles.editor')}</SelectItem>
                        <SelectItem value="viewer">{t('collaborators.roles.viewer')}</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    data-testid="collaborator-add-button"
                    disabled={!selectedMemberId || isPending}
                    onClick={() => {
                        if (!selectedMemberId) {
                            return;
                        }
                        onAdd(selectedMemberId as Id<'user'>, selectedRole);
                    }}
                >
                    {t('collaborators.add')}
                </Button>
            </div>
        </div>
    );
}
