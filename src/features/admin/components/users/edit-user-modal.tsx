'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { Doc } from '@/convex/_generated/dataModel';
import { GLOBAL_ADMIN_ROLE, USER_ROLE } from '@shared/platform-roles';
import { api } from '@/convex/_generated/api';
import { useConvexMutation } from '@convex-dev/react-query';

export function EditUserModal({
    user,
    roleLocked = false,
    onSuccessAction,
}: {
    user: Doc<'user'>;
    roleLocked?: boolean;
    onSuccessAction?: () => void;
}) {
    const t = useTranslations('Admin');
    const tCommon = useTranslations('Common');

    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState(user.email);
    const [name, setName] = useState(user.name);
    const [role, setRole] = useState(
        user.role === 'ADMIN' ? GLOBAL_ADMIN_ROLE : user.role || USER_ROLE
    );
    const updateUserMutation = useConvexMutation(api.admin.updateUser);

    const updateUser = useMutation({
        mutationFn: async () => {
            return await updateUserMutation({
                userId: user._id,
                email,
                name,
                role: role === GLOBAL_ADMIN_ROLE ? GLOBAL_ADMIN_ROLE : USER_ROLE,
            });
        },
        onSuccess: () => {
            toast.success(t('usersTable.toast.updatedSuccess'));
            setOpen(false);
            onSuccessAction?.();
        },
        onError: (error: Error) => {
            toast.error(t('usersTable.toast.updateFailed', { message: error.message }));
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid="user-edit-open">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent data-testid="user-edit-modal">
                <DialogHeader>
                    <DialogTitle>{t('editUserModal.title')}</DialogTitle>
                    <DialogDescription>{t('editUserModal.description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">{tCommon('fields.email')}</Label>
                        <Input
                            id="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            data-testid="user-edit-email-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">{tCommon('fields.name')}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            data-testid="user-edit-name-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">{tCommon('fields.role')}</Label>
                        <Select value={role} onValueChange={setRole} disabled={roleLocked}>
                            <SelectTrigger data-testid="user-edit-role-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={USER_ROLE}>
                                    {t('editUserModal.roles.user')}
                                </SelectItem>
                                <SelectItem value={GLOBAL_ADMIN_ROLE}>
                                    {t('editUserModal.roles.globalAdmin')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        data-testid="user-edit-cancel-button"
                    >
                        {tCommon('actions.cancel')}
                    </Button>
                    <Button
                        onClick={() => updateUser.mutate()}
                        disabled={updateUser.isPending}
                        data-testid="user-edit-save-button"
                    >
                        {updateUser.isPending ? tCommon('actions.saving') : tCommon('actions.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
