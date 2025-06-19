import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface ModalProps {
    title: string;
    description: string;
    children: ReactNode;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    buttonHidden?: boolean;
    buttonText?: string;
}

export function Modal({
    title,
    description,
    children,
    isOpen,
    onOpenChange,
    buttonHidden,
    buttonText,
}: ModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {!buttonHidden && <Button variant="outline">{buttonText}</Button>}
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