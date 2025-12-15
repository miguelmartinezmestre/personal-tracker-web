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
import { useRequireAdmin } from '@/hooks/use-user-role';

type User = {
    id: string;
    email: string;
    name: string;
    role?: string | string[];
    banned?: boolean;
};

export function EditUserModal({ user, onSuccess }: { user: User; onSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState(user.email);
    const [name, setName] = useState(user.name);
    const [role, setRole] = useState(Array.isArray(user.role) ? user.role[0] : user.role || 'user');
    const queryClient = useQueryClient();

    // Verify admin role
    try {
        useRequireAdmin();
    } catch (error) {
        return (
            <Button size="sm" variant="outline" disabled>
                <Edit className="h-4 w-4" />
            </Button>
        );
    }

    const updateUser = useMutation({
        mutationFn: async () => {
            return await authClient.admin.updateUser({
                userId: user.id,
                data: {
                    email,
                    name,
                    role,
                },
            });
        },
        onSuccess: () => {
            toast.success('Usuario actualizado exitosamente');
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            onSuccess?.();
        },
        onError: (error: any) => {
            toast.error(`Error al actualizar usuario: ${error.message}`);
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                    <DialogDescription>Modifica la información del usuario</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Rol</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">Usuario</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="ADMIN">ADMIN</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={() => updateUser.mutate()} disabled={updateUser.isPending}>
                        {updateUser.isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
