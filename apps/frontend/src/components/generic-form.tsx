import { useForm, type Path, type PathValue } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Key } from 'react';

type GenericFormProps<T extends z.ZodType<any, any>> = {
    schema: T;
    defaultValues: z.infer<T>;
    onSubmit: (values: z.infer<T>) => void;
    className?: string;
};

export function GenericForm<T extends z.ZodType<any, any>>({
    schema,
    defaultValues,
    onSubmit,
    className,
}: GenericFormProps<T>) {
    type FormValues = z.infer<T>;

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: defaultValues,
    });

    const renderField = (name: Path<FormValues>, fieldSchema: z.ZodTypeAny) => {
        if (fieldSchema instanceof z.ZodString) {
            if (fieldSchema.description === 'textarea') {
                return <Textarea id={name} {...form.register(name)} />;
            }
            return <Input type="text" id={name} {...form.register(name)} />;
        } else if (fieldSchema instanceof z.ZodNumber) {
            return <Input type="number" id={name} {...form.register(name)} />;
        } else if (fieldSchema instanceof z.ZodBoolean) {
            return (
                <Checkbox
                    id={name}
                    checked={form.watch(name)}
                    onCheckedChange={checked =>
                        form.setValue(name, checked as PathValue<FormValues, Path<FormValues>>)
                    }
                />
            );
        } else if (fieldSchema instanceof z.ZodEnum) {
            const options = fieldSchema._def.values as string[];
            return (
                <Select
                    onValueChange={(value: string) =>
                        form.setValue(name, value as PathValue<FormValues, Path<FormValues>>)
                    }
                    defaultValue={(defaultValues as any)?.[name]}
                >
                    <SelectTrigger id={name}>
                        <SelectValue
                            placeholder="Select"
                            defaultValue={(defaultValues as any)?.[name]}
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map(option => (
                            <SelectItem key={option} value={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        } else if (fieldSchema instanceof z.ZodLiteral) {
            const literalValue = fieldSchema._def.value;
            return (
                <Input
                    type="text"
                    id={name}
                    {...form.register(name)}
                    defaultValue={literalValue}
                    readOnly
                />
            );
        } else if (fieldSchema instanceof z.ZodUnion) {
            const options = fieldSchema._def.options.map(
                (option: z.ZodLiteral<any>) => option._def.value
            );
            return (
                <RadioGroup
                    defaultValue={form.watch(name)}
                    onValueChange={(value: string) =>
                        form.setValue(name, value as PathValue<FormValues, Path<FormValues>>)
                    }
                >
                    {options.map((option: string) => (
                        <div className="flex items-center space-x-2" key={option}>
                            <RadioGroupItem value={option} id={`${name}-${option}`} />
                            <Label htmlFor={`${name}-${option}`}>{option}</Label>
                        </div>
                    ))}
                </RadioGroup>
            );
        } else if (fieldSchema instanceof z.ZodArray) {
            // Basic array handling - you might want to expand this for more complex use cases
            return (
                <div>
                    {form.watch(name)?.map((_: any, index: Key | null | undefined) => (
                        <div key={index} className="flex items-center space-x-2">
                            {renderField(
                                `${name}.${index}` as Path<FormValues>,
                                fieldSchema._def.type
                            )}
                            <Button
                                type="button"
                                onClick={() =>
                                    form.setValue(
                                        name,
                                        form
                                            .watch(name)
                                            .filter(
                                                (_: any, i: Key | null | undefined) => i !== index
                                            )
                                    )
                                }
                            >
                                Remove
                            </Button>
                        </div>
                    ))}
                    <Button
                        type="button"
                        onClick={() =>
                            form.setValue(name, [
                                ...(form.watch(name) || []),
                                undefined,
                            ] as PathValue<FormValues, Path<FormValues>>)
                        }
                    >
                        Add Item
                    </Button>
                </div>
            );
        } else {
            // Default to text input for unknown types
            return <Input type="text" id={name} {...form.register(name)} />;
        }
    };

    const renderFields = (schema: z.ZodTypeAny, prefix = '') => {
        if (schema instanceof z.ZodObject) {
            return Object.entries(schema.shape).map(([key, field]) => {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                return (
                    <div key={fullKey} className="space-y-2">
                        <Label htmlFor={fullKey}>{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                        {renderField(fullKey as Path<FormValues>, field as z.ZodTypeAny)}
                        {form.formState.errors[key] && (
                            <p className="text-sm text-red-500">
                                {(form.formState.errors[key]?.message as string) ||
                                    'This field is required'}
                            </p>
                        )}
                    </div>
                );
            });
        } else {
            // For primitive schemas or other types, render a single field
            return (
                <div className="space-y-2">
                    <Label htmlFor="value">Value</Label>
                    {renderField('value' as Path<FormValues>, schema)}
                </div>
            );
        }
    };

    const onSubmitHandler = (values: FormValues) => {
        onSubmit(values);
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmitHandler)} className={cn('space-y-4', className)}>
            {renderFields(schema)}
            <Button type="submit">Submit</Button>
        </form>
    );
}
