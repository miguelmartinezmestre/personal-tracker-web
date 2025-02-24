import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@radix-ui/react-dialog";
import { useState } from "react";
import { ProfileForm } from "./objetives-modal";
import { Button } from "./ui/button";
import { DialogHeader } from "./ui/dialog";

export function Modal({ refetch }: { refetch: () => void }) {
    const [open, setOpen] = useState(false);

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Crear</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Crear objetivo</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <ProfileForm onClose={handleClose} refetch={refetch} />
            </DialogContent>
        </Dialog>
    );
}
