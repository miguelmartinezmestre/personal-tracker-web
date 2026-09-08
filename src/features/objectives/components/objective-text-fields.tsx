'use client';
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-tanstack';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
type ObjectiveTextFieldsProps = {
    titleLabel: string;
    descriptionLabel: string;
    titlePlaceholder: string;
    descriptionPlaceholder: string;
    titleDescription: string;
    titleTestId: string;
    descriptionTestId: string;
};
export function ObjectiveTextFields({
    titleLabel,
    descriptionLabel,
    titlePlaceholder,
    descriptionPlaceholder,
    titleDescription,
    titleTestId,
    descriptionTestId,
}: ObjectiveTextFieldsProps) {
    return (
        <>
            <FormField
                name="title"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{titleLabel}</FormLabel>
                        <FormControl>
                            <Input
                                placeholder={titlePlaceholder}
                                {...field}
                                data-testid={titleTestId}
                            />
                        </FormControl>
                        <FormDescription>{titleDescription}</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                name="description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{descriptionLabel}</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder={descriptionPlaceholder}
                                className="resize-none min-h-[80px]"
                                {...field}
                                value={typeof field.value === 'string' ? field.value : ''}
                                data-testid={descriptionTestId}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
}
