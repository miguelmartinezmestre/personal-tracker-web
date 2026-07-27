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
    testIdPrefix: 'category' | 'category-edit';
    showColorDescription?: boolean;
}

export function CategoryFormFields({
    testIdPrefix,
    showColorDescription = false,
}: CategoryFormFieldsProps) {
    const t = useTranslations('Objectives.categories');
    const tCommon = useTranslations('Common');

    return (
        <>
            <FormField
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('fields.name')}</FormLabel>
                        <FormControl>
                            <Input
                                placeholder={t('placeholders.name')}
                                {...field}
                                data-testid={`${testIdPrefix}-name-input`}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                name="color"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('fields.color')}</FormLabel>
                        <Select
                            value={field.value as string | undefined}
                            onValueChange={field.onChange}
                        >
                            <FormControl>
                                <SelectTrigger data-testid={`${testIdPrefix}-color-select`}>
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
                                    `colors.${
                                        colorOptions.find(
                                            colorOption => colorOption.value === field.value
                                        )?.labelKey ?? 'blue'
                                    }`
                                )}
                            </FormDescription>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                name="icon"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('fields.icon')}</FormLabel>
                        <Select
                            value={(field.value as string | undefined) ?? 'none'}
                            onValueChange={value =>
                                field.onChange(value === 'none' ? undefined : value)
                            }
                        >
                            <FormControl>
                                <SelectTrigger data-testid={`${testIdPrefix}-icon-select`}>
                                    <SelectValue placeholder={t('placeholders.selectIcon')} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none" data-testid={`${testIdPrefix}-icon-none`}>
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
                )}
            />
        </>
    );
}
