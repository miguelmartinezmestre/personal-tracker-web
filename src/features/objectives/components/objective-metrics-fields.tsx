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
import { cn } from '@/lib/utils';
function isFiniteNumber(value: number): boolean {
    return Number.isFinite(value);
}
type ObjectiveMetricsFieldsProps = {
    form: TanStackFormApi;
    mode: 'create' | 'edit';
    targetValueLabel: string;
    unitLabel: string;
    unitPlaceholder: string;
    initialValueLabel: string;
    initialValueDescription: string;
    targetTestId: string;
    startTestId: string;
    unitTestId: string;
};
export function ObjectiveMetricsFields({
    form,
    mode,
    targetValueLabel,
    unitLabel,
    unitPlaceholder,
    initialValueLabel,
    initialValueDescription,
    targetTestId,
    startTestId,
    unitTestId,
}: ObjectiveMetricsFieldsProps) {
    return (
        <div
            className={cn(
                'grid grid-cols-1 gap-4',
                mode === 'create' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            )}
        >
            <form.Field name="targetValue">
                {field => (
                    <FieldShell name={field.name} error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{targetValueLabel}</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    name={field.name}
                                    value={
                                        typeof field.state.value === 'number' &&
                                        isFiniteNumber(field.state.value)
                                            ? field.state.value
                                            : ''
                                    }
                                    onChange={event =>
                                        field.handleChange(Number.parseFloat(event.target.value))
                                    }
                                    onBlur={field.handleBlur}
                                    data-testid={targetTestId}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>

            {mode === 'create' ? (
                <form.Field name="startValue">
                    {field => (
                        <FieldShell name={field.name} error={getFieldError(form, field)}>
                            <FormItem>
                                <FormLabel>{initialValueLabel}</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={
                                            typeof field.state.value === 'number' &&
                                            isFiniteNumber(field.state.value)
                                                ? field.state.value
                                                : ''
                                        }
                                        name={field.name}
                                        onChange={event =>
                                            field.handleChange(
                                                Number.parseFloat(event.target.value)
                                            )
                                        }
                                        onBlur={field.handleBlur}
                                        data-testid={startTestId}
                                    />
                                </FormControl>
                                <FormDescription>{initialValueDescription}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        </FieldShell>
                    )}
                </form.Field>
            ) : null}

            <form.Field name="unit">
                {field => (
                    <FieldShell name={field.name} error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{unitLabel}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={unitPlaceholder}
                                    name={field.name}
                                    value={
                                        typeof field.state.value === 'string'
                                            ? field.state.value
                                            : ''
                                    }
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    data-testid={unitTestId}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>
        </div>
    );
}
