'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarIcon, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@repo/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@repo/ui/components/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@repo/ui/components/form-tanstack';
import { Input } from '@repo/ui/components/input';
import { Textarea } from '@repo/ui/components/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@repo/ui/components/select';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { Calendar } from '@repo/ui/components/calendar';
import { cn } from '@repo/ui/lib/utils';
import { CreateNotification, notificationSchema } from '@/features/notifications/notification';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { Doc, Id } from '@repo/backend/convex/_generated/dataModel';

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
    const [open, setOpen] = useState(false);

    const objectives = useQuery(convexQuery(api.objectives.getObjectivesByUser, DEFAULT_PAGINATION_OPTS));

    const createNotification = useMutation({
        mutationFn: useConvexMutation(api.notifications.createNotification),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.notifications.getNotificationsByUser, DEFAULT_PAGINATION_OPTS).queryKey,
            });
            toast.success(t('toast.created'));
        },
        onError: () => {
            toast.error(t('toast.createFailed'));
        },
    });

    const form = useForm<CreateNotification>({
        defaultValues,
        validators: {
            onChange: notificationSchema,
            onSubmit: notificationSchema,
        },
        onSubmit: async ({ value }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: CreateNotification) => {
        await createNotification.mutateAsync({
            objective: values.objective as Id<'objectives'>,
            notificationType: values.notificationType,
            notificationDate: new Date(values.notificationDate).getTime(),
            message: values.message,
        });
        setOpen(false);
        form.reset();
    };

    const objectiveOptions = (objectives.data?.page ?? []) as Doc<'objectives'>[];
    const isObjectiveLoading = objectives.isLoading;
    const hasObjectives = objectiveOptions.length > 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="notification-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createNotification')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('createNotification')}</DialogTitle>
                    <DialogDescription>{t('createNotificationDescription')}</DialogDescription>
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
                            name="objective"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('form.objective')}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || ''}
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
                                                <SelectItem
                                                    key={String(objective._id)}
                                                    value={String(objective._id)}
                                                >
                                                    {objective.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {hasObjectives
                                            ? t('form.objectiveHelper')
                                            : t('noObjectives')}
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
                                            value={field.value || ''}
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
                                            value={field.value || ''}
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
                                                        new Date(field.value).toLocaleDateString()
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
                                                selected={field.value || undefined}
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

                        <DialogFooter className="pt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => setOpen(false)}
                                data-testid="notification-cancel-button"
                            >
                                {t('form.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                data-testid="notification-save-button"
                                disabled={
                                    createNotification.isPending ||
                                    isObjectiveLoading ||
                                    !hasObjectives
                                }
                            >
                                {t('form.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
