'use client';
import {
    FieldShell,
    getFieldError,
    FormControl,
    FormDescription,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-fields';
import type { TanStackFormApi } from '@/components/forms/form-types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
type ObjectiveTextFieldsProps = {
    form: TanStackFormApi;
    titleLabel: string;
    descriptionLabel: string;
    titlePlaceholder: string;
    descriptionPlaceholder: string;
    titleDescription: string;
    titleTestId: string;
    descriptionTestId: string;
};
export function ObjectiveTextFields({
    form,
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
            <form.Field name="title">
                {field => (
                    <FieldShell error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{titleLabel}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={titlePlaceholder}
                                    name={field.name}
                                    value={
                                        typeof field.state.value === 'string' ||
                                        typeof field.state.value === 'number'
                                            ? field.state.value
                                            : ''
                                    }
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    data-testid={titleTestId}
                                />
                            </FormControl>
                            <FormDescription>{titleDescription}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>

            <form.Field name="description">
                {field => (
                    <FieldShell error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{descriptionLabel}</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder={descriptionPlaceholder}
                                    className="resize-none min-h-[80px]"
                                    name={field.name}
                                    value={
                                        typeof field.state.value === 'string'
                                            ? field.state.value
                                            : ''
                                    }
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    data-testid={descriptionTestId}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>
        </>
    );
}
