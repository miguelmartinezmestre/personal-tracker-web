import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@repo/ui/components/alert-dialog';
import { Button } from '@repo/ui/components/button';
// import { useAuthContext } from '../src/providers/auth-provider';
// import { useDeleteUserMutation } from '../services/mutations/user';

export function ConfirmationDeleteAccount() {
    // const { user } = useAuthContext();
    // const { mutation } = useDeleteUserMutation();

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline">Borrar cuenta</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta y
                        eliminará tus datos de nuestros servidores.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            // mutation.mutate({ _id: user.id });
                        }}
                    >
                        Eliminar cuenta
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
