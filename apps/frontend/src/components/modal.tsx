import { ReactNode } from 'react';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';

interface ModalProps {
    title: string;
    description: string;
    children: ReactNode;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function Modal({ title, description, children, isOpen, onOpenChange }: ModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline">Crear</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">{children}</div>
            </DialogContent>
        </Dialog>
    );
}
