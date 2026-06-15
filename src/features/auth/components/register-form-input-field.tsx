'use client';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-tanstack';
import { Input } from '@/components/ui/input';

interface RegisterFormInputFieldProps {
    name: 'username' | 'email' | 'password' | 'confirmPassword';
    label: string;
    placeholder: string;
    type?: string;
    testId: string;
}

export function RegisterFormInputField({
    name,
    label,
    placeholder,
    type = 'text',
    testId,
}: RegisterFormInputFieldProps) {
    return (
        <FormField
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-foreground">{label}</FormLabel>
                    <FormControl>
                        <Input
                            {...field}
                            type={type}
                            placeholder={placeholder}
                            className="focus:ring-2 focus:ring-primary/20"
                            data-testid={testId}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
