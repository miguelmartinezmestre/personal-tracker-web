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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { categoryIconSchema } from '@/features/categories/schemas/category';
import { getLucideIcon } from '@/lib/icons';
import { useTranslations } from 'next-intl';
const colorOptions = [
    { value: '#ef4444', labelKey: 'red' },
    { value: '#f97316', labelKey: 'orange' },
    { value: '#eab308', labelKey: 'yellow' },
    { value: '#22c55e', labelKey: 'green' },
    { value: '#14b8a6', labelKey: 'teal' },
    { value: '#3b82f6', labelKey: 'blue' },
    { value: '#a855f7', labelKey: 'purple' },
    { value: '#ec4899', labelKey: 'pink' },
    { value: '#6b7280', labelKey: 'gray' },
] as const;
const iconOptions = categoryIconSchema.options;
interface CategoryFormFieldsProps {
    form: TanStackFormApi;
    testIdPrefix: 'category' | 'category-edit';
    showColorDescription?: boolean;
}
export function CategoryFormFields({
    form,
    testIdPrefix,
    showColorDescription = false,
}: CategoryFormFieldsProps) {
    const t = useTranslations('Objectives.categories');
    const tCommon = useTranslations('Common');
    return (
        <>
            <form.Field name="name">
                {field => (
                    <FieldShell error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{t('fields.name')}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('placeholders.name')}
                                    name={field.name}
                                    value={
                                        typeof field.state.value === 'string' ||
                                        typeof field.state.value === 'number'
                                            ? field.state.value
                                            : ''
                                    }
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    data-testid={`${testIdPrefix}-name-input`}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>

            <form.Field name="color">
                {field => (
                    <FieldShell error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{t('fields.color')}</FormLabel>
                            <Select
                                value={
                                    typeof field.state.value === 'string'
                                        ? field.state.value
                                        : undefined
                                }
                                onValueChange={value => field.handleChange(value)}
                            >
                                <FormControl>
                                    <SelectTrigger
                                        onBlur={field.handleBlur}
                                        data-testid={`${testIdPrefix}-color-select`}
                                    >
                                        <SelectValue placeholder={t('fields.color')} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {colorOptions.map(option => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                            data-testid={`${testIdPrefix}-color-${option.value}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-4 w-4 rounded border"
                                                    style={{
                                                        backgroundColor: option.value,
                                                    }}
                                                />
                                                {tCommon(`colors.${option.labelKey}`)}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {showColorDescription && (
                                <FormDescription>
                                    {tCommon(
                                        `colors.${colorOptions.find(colorOption => colorOption.value === field.state.value)?.labelKey ?? 'blue'}`
                                    )}
                                </FormDescription>
                            )}
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>

            <form.Field name="icon">
                {field => (
                    <FieldShell error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{t('fields.icon')}</FormLabel>
                            <Select
                                value={
                                    typeof field.state.value === 'string'
                                        ? field.state.value
                                        : 'none'
                                }
                                onValueChange={value =>
                                    field.handleChange(value === 'none' ? undefined : value)
                                }
                            >
                                <FormControl>
                                    <SelectTrigger
                                        onBlur={field.handleBlur}
                                        data-testid={`${testIdPrefix}-icon-select`}
                                    >
                                        <SelectValue placeholder={t('placeholders.selectIcon')} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem
                                        value="none"
                                        data-testid={`${testIdPrefix}-icon-none`}
                                    >
                                        {tCommon('icons.tag')}
                                    </SelectItem>
                                    {iconOptions.map(icon => {
                                        const IconComponent = getLucideIcon(icon);
                                        return (
                                            <SelectItem
                                                key={icon}
                                                value={icon}
                                                data-testid={`${testIdPrefix}-icon-${icon}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {IconComponent ? (
                                                        <IconComponent className="h-4 w-4" />
                                                    ) : null}
                                                    {tCommon('icons.' + icon)}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>
        </>
    );
}
