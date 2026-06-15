'use client';

import { CalendarIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatDate } from '@/lib/format-date';
import { Button } from '@/components/ui/button';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
    CATEGORY_EMPTY_VALUE,
    CATEGORY_LOADING_VALUE,
    type CategoryOption,
} from '@/features/objectives/lib/objective-category-selection';

type ObjectiveFormFieldsProps = {
    mode: 'create' | 'edit';
    categoryOptions: CategoryOption[];
    categoriesLoading: boolean;
};

function getTestId(mode: ObjectiveFormFieldsProps['mode'], name: string) {
    return mode === 'create' ? `objective-${name}` : `objective-edit-${name}`;
}

export function ObjectiveFormFields({
    mode,
    categoryOptions,
    categoriesLoading,
}: ObjectiveFormFieldsProps) {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const titleLabel = mode === 'create' ? t('smartForm.fields.titleRequired') : t('title');
    const descriptionLabel =
        mode === 'create' ? t('smartForm.fields.description') : t('description');
    const categoryLabel = mode === 'create' ? t('smartForm.fields.category') : t('category');
    const targetValueLabel =
        mode === 'create' ? t('smartForm.fields.targetValueRequired') : t('targetValue');
    const unitLabel = mode === 'create' ? t('smartForm.fields.unit') : t('unit');
    const unitPlaceholder = mode === 'create' ? t('unitExample') : t('enterUnit');
    const deadlineLabel = mode === 'create' ? t('smartForm.fields.deadline') : t('deadline');

    return (
        <>
            <FormField
                name="title"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{titleLabel}</FormLabel>
                        <FormControl>
                            <Input
                                placeholder={t('enterObjectiveTitle')}
                                {...field}
                                data-testid={getTestId(mode, 'title-input')}
                            />
                        </FormControl>
                        <FormDescription>
                            {t('giveYourObjectiveAClearConciseTitle')}
                        </FormDescription>
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
                                placeholder={t('describeObjectiveInDetail')}
                                className="resize-none min-h-[80px]"
                                {...field}
                                value={(field.value as string) || ''}
                                data-testid={getTestId(mode, 'description-input')}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                name="categoryId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{categoryLabel}</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={(field.value as string) || ''}
                        >
                            <FormControl>
                                <SelectTrigger data-testid={getTestId(mode, 'category-select')}>
                                    <SelectValue placeholder={t('selectACategory')} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {categoriesLoading ? (
                                    <SelectItem value={CATEGORY_LOADING_VALUE} disabled>
                                        {tCommon('loading')}
                                    </SelectItem>
                                ) : categoryOptions.length === 0 ? (
                                    <SelectItem value={CATEGORY_EMPTY_VALUE} disabled>
                                        {t('categories.emptyTitle')}
                                    </SelectItem>
                                ) : (
                                    categoryOptions.map(category => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.label}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    data-testid={getTestId(mode, 'target-input')}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    name="unit"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{unitLabel}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={unitPlaceholder}
                                    {...field}
                                    value={(field.value as string) || ''}
                                    data-testid={getTestId(mode, 'unit-input')}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                name="deadline"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>{deadlineLabel}</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-full pl-3 text-left font-normal',
                                            !field.value && 'text-muted-foreground'
                                        )}
                                        data-testid={getTestId(mode, 'deadline-button')}
                                    >
                                        {field.value ? (
                                            formatDate(field.value as number, locale)
                                        ) : (
                                            <span>{t('pickADate')}</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={
                                        field.value ? new Date(field.value as number) : undefined
                                    }
                                    onSelect={value =>
                                        field.onChange(value ? value.getTime() : null)
                                    }
                                />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
}
