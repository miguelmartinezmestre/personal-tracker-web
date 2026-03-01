'use client';

import { useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { CalendarIcon, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Form,
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
import { cn } from '@/lib/ui-utils/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { CreateObjective, objectiveSchema } from '@/features/objectives/schemas/objective';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Doc } from '@/convex/_generated/dataModel';

const defaultValues: CreateObjective = {
    title: '',
    description: '',
    category: null,
    targetValue: 100,
    currentValue: 0,
    startValue: 0,
    deadline: null,
    status: 'active',
    scope: 'personal',
    unit: '',
};

export default function CreateObjectiveFormModal() {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const createObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.createObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.objectives.getObjectivesByUser] });
            queryClient.invalidateQueries({ queryKey: [api.objectives.getOrganizationObjectives] });
        },
    });

    const categoriesQuery = useQuery({
        ...convexQuery(api.categories.getCategoriesByUser, {}),
    });

    const categoryOptions = useMemo(
        () =>
            (categoriesQuery.data ?? []).map((category: Doc<'categories'>) => ({
                id: String(category._id),
                value: category.name,
                label: category.name,
            })),
        [categoriesQuery.data]
    );

    const form = useForm<CreateObjective>({
        defaultValues,
        validators: {
            onChange: objectiveSchema,
            onSubmit: objectiveSchema,
        },
        onSubmit: async ({ value }) => {
            await createObjectiveMutation.mutateAsync({
                title: value.title,
                description: value.description ?? undefined,
                category: value.category ?? undefined,
                targetValue: Number(value.targetValue),
                startValue: 0,
                currentValue: 0,
                deadline: value.deadline ?? undefined,
                scope: value.scope,
                unit: value.unit ?? undefined,
            });
            setOpen(false);
            form.reset();
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="objective-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createObjective')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('createObjective')}</DialogTitle>
                    <DialogDescription>{t('createObjectiveDescription')}</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            form.handleSubmit();
                        }}
                        className="space-y-5 py-4"
                    >
                        <FormField
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('smartForm.fields.titleRequired')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('enterObjectiveTitle')}
                                            {...field}
                                            data-testid="objective-title-input"
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
                                    <FormLabel>{t('smartForm.fields.description')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('describeObjectiveInDetail')}
                                            className="resize-none min-h-[80px]"
                                            {...field}
                                            value={field.value || ''}
                                            data-testid="objective-description-input"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                name="scope"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('scope')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger data-testid="objective-scope-select">
                                                    <SelectValue placeholder={t('scope')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="personal">
                                                    {t('scopeOptions.personal')}
                                                </SelectItem>
                                                <SelectItem value="organization">
                                                    {t('scopeOptions.organization')}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('smartForm.fields.category')}</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger data-testid="objective-category-select">
                                                    <SelectValue
                                                        placeholder={t('selectACategory')}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categoriesQuery.isLoading ? (
                                                    <SelectItem value="loading" disabled>
                                                        {tCommon('loading')}
                                                    </SelectItem>
                                                ) : categoryOptions.length === 0 ? (
                                                    <SelectItem value="empty" disabled>
                                                        {t('categories.emptyTitle')}
                                                    </SelectItem>
                                                ) : (
                                                    categoryOptions.map(category => (
                                                        <SelectItem
                                                            key={category.id}
                                                            value={category.value}
                                                        >
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
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                name="targetValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t('smartForm.fields.targetValueRequired')}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={e =>
                                                    field.onChange(
                                                        Number.parseFloat(e.target.value)
                                                    )
                                                }
                                                data-testid="objective-target-input"
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
                                        <FormLabel>{t('smartForm.fields.unit')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t('unitExample')}
                                                {...field}
                                                value={field.value || ''}
                                                data-testid="objective-unit-input"
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
                                    <FormLabel>{t('smartForm.fields.deadline')}</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-full pl-3 text-left font-normal',
                                                        !field.value && 'text-muted-foreground'
                                                    )}
                                                    data-testid="objective-deadline-button"
                                                >
                                                    {field.value ? (
                                                        new Date(field.value).toLocaleDateString()
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
                                                    field.value ? new Date(field.value) : undefined
                                                }
                                                onSelect={value =>
                                                    field.onChange(value ? value.getTime() : null)
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => setOpen(false)}
                                data-testid="objective-cancel-button"
                            >
                                {t('cancel')}
                            </Button>
                            <Button type="submit" data-testid="objective-save-button">
                                {t('saveObjective')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
