'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@repo/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@repo/ui/components/select';
import { authClient } from '@/lib/auth-client';
import { Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRequireAdmin } from '@/hooks/use-user-role';
import type { BetterAuthUser } from '@repo/backend/convex/admin';

export function EditUserModal({
    user,
    onSuccessAction,
}: {
    user: BetterAuthUser;
    onSuccessAction?: () => void;
}) {
    const t = useTranslations('Admin');
    const tCommon = useTranslations('Common');

    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState(user.email);
    const [name, setName] = useState(user.name);
    const [role, setRole] = useState(user.role || 'user');
    const queryClient = useQueryClient();

    const updateUser = useMutation({
        mutationFn: async () => {
            return await authClient.admin.updateUser({
                userId: user._id,
                data: {
                    email,
                    name,
                    role,
                },
            });
        },
        onSuccess: () => {
            toast.success(t('usersTable.toast.updatedSuccess'));
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            onSuccessAction?.();
        },
        onError: (error: Error) => {
            toast.error(t('usersTable.toast.updateFailed', { message: error.message }));
        },
    });

    // Verify admin role
    try {
        useRequireAdmin();
    } catch {
        return (
            <Button size="sm" variant="outline" disabled>
                <Edit className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid="user-edit-open">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('editUserModal.title')}</DialogTitle>
                    <DialogDescription>{t('editUserModal.description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">{tCommon('fields.email')}</Label>
                        <Input id="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">{tCommon('fields.name')}</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">{tCommon('fields.role')}</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">
                                    {t('editUserModal.roles.user')}
                                </SelectItem>
                                <SelectItem value="admin">
                                    {t('editUserModal.roles.admin')}
                                </SelectItem>
                                <SelectItem value="ADMIN">
                                    {t('editUserModal.roles.admin')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        {tCommon('actions.cancel')}
                    </Button>
                    <Button onClick={() => updateUser.mutate()} disabled={updateUser.isPending}>
                        {updateUser.isPending ? tCommon('actions.saving') : tCommon('actions.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
