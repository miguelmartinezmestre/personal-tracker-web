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
import { cn } from '@/lib/utils';
function isFiniteNumber(value: number): boolean {
    return Number.isFinite(value);
}
type ObjectiveMetricsFieldsProps = {
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
            <FormField
                name="targetValue"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{targetValueLabel}</FormLabel>
                        <FormControl>
                            <Input
                                type="number"
                                {...field}
                                onChange={event =>
                                    field.onChange(Number.parseFloat(event.target.value))
                                }
                                data-testid={targetTestId}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {mode === 'create' ? (
                <FormField
                    name="startValue"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{initialValueLabel}</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min={0}
                                    {...field}
                                    value={
                                        typeof field.value === 'number' &&
                                        isFiniteNumber(field.value)
                                            ? field.value
                                            : ''
                                    }
                                    onChange={event =>
                                        field.onChange(Number.parseFloat(event.target.value))
                                    }
                                    data-testid={startTestId}
                                />
                            </FormControl>
                            <FormDescription>{initialValueDescription}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : null}

            <FormField
                name="unit"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{unitLabel}</FormLabel>
                        <FormControl>
                            <Input
                                placeholder={unitPlaceholder}
                                {...field}
                                value={typeof field.value === 'string' ? field.value : ''}
                                data-testid={unitTestId}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}
