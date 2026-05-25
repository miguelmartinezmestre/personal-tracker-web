'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarIcon, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
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
    CreateNotification,
    notificationSchema,
} from '@/features/notifications/schemas/notification';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import FormModal from '@/components/forms/form-modal';
import { invalidateConvexQuery } from '@/platform/convex/query-keys';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGINATION_OPTS = {
    paginationOpts: {
        numItems: DEFAULT_PAGE_SIZE,
        cursor: null,
    },
};

const defaultValues: CreateNotification = {
    objective: '',
    notificationType: 'reminder',
    notificationDate: new Date(),
    message: '',
};

export default function CreateNotificationFormModal() {
    const t = useTranslations('Notifications');
    const queryClient = useQueryClient();

    const objectives = useQuery(
        convexQuery(api.objectives.getObjectivesByUser, DEFAULT_PAGINATION_OPTS)
    );

    const createNotification = useMutation({
        mutationFn: useConvexMutation(api.notifications.createNotification),
        onSuccess: () => {
            invalidateConvexQuery(
                queryClient,
                convexQuery(api.notifications.getNotificationsByUser, DEFAULT_PAGINATION_OPTS)
            );
            toast.success(t('toast.created'));
        },
        onError: () => {
            toast.error(t('toast.createFailed'));
        },
    });

    const objectiveOptions = (objectives.data?.page ?? []) as Doc<'objectives'>[];
    const isObjectiveLoading = objectives.isLoading;
    const hasObjectives = objectiveOptions.length > 0;

    return (
        <FormModal<CreateNotification>
            trigger={
                <Button className="gap-2" data-testid="notification-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createNotification')}
                </Button>
            }
            title={t('createNotification')}
            description={t('createNotificationDescription')}
            formOptions={{
                defaultValues,
                validators: {
                    onChange: notificationSchema,
                    onSubmit: notificationSchema,
                },
            }}
            onSubmit={async (values: CreateNotification) => {
                await createNotification.mutateAsync({
                    objective: values.objective as Id<'objectives'>,
                    notificationType: values.notificationType,
                    notificationDate: new Date(values.notificationDate).getTime(),
                    message: values.message,
                });
            }}
            submitLabel={t('form.save')}
            cancelLabel={t('form.cancel')}
            isPending={createNotification.isPending}
            submitDisabled={isObjectiveLoading || !hasObjectives}
            cancelTestId="notification-cancel-button"
            submitTestId="notification-save-button"
        >
            {() => (
                <>
                    <FormField
                        name="objective"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('form.objective')}</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    value={(field.value as string) || ''}
                                    disabled={isObjectiveLoading || !hasObjectives}
                                >
                                    <FormControl>
                                        <SelectTrigger data-testid="notification-objective-select">
                                            <SelectValue
                                                placeholder={
                                                    isObjectiveLoading
                                                        ? t('loadingObjectives')
                                                        : t('form.selectObjective')
                                                }
                                            />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {objectiveOptions.map(objective => (
                                            <SelectItem key={objective._id} value={objective._id}>
                                                {objective.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    {hasObjectives ? t('form.objectiveHelper') : t('noObjectives')}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        name="notificationType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('form.notificationType')}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t('form.typePlaceholder')}
                                        {...field}
                                        value={(field.value as string) || ''}
                                        onChange={e => field.onChange(e.target.value)}
                                        data-testid="notification-type-input"
                                    />
                                </FormControl>
                                <FormDescription>{t('form.typeHelper')}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('form.message')}</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder={t('form.messagePlaceholder')}
                                        className="resize-none min-h-[80px]"
                                        {...field}
                                        value={(field.value as string) || ''}
                                        data-testid="notification-message-input"
                                    />
                                </FormControl>
                                <FormDescription>{t('form.messageHelper')}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        name="notificationDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>{t('form.notificationDate')}</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={'outline'}
                                                className={cn(
                                                    'w-full pl-3 text-left font-normal',
                                                    !field.value && 'text-muted-foreground'
                                                )}
                                            >
                                                {field.value ? (
                                                    new Date(
                                                        field.value as Date | number | string
                                                    ).toLocaleDateString()
                                                ) : (
                                                    <span>{t('form.pickADate')}</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={
                                                (field.value as Date | undefined) || undefined
                                            }
                                            onSelect={field.onChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>{t('form.dateHelper')}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}
        </FormModal>
    );
}
