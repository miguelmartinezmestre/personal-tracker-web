'use client';

import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { TanStackFormApi } from '@/components/forms/form-types';
import { getFieldErrors } from '@/components/forms/form-utils';
import type { Id } from '@/convex/_generated/dataModel';
import {
    MAX_DUE_SOON_DAYS,
    OBJECTIVE_DESCRIPTION_MAX_LENGTH,
    OBJECTIVE_TITLE_MAX_LENGTH,
    OBJECTIVE_UNIT_MAX_LENGTH,
} from '@/convex/features/objectives/constants';
import { todayDateInput } from '@/features/objectives/lib/dates';
import { AccessEditor } from '@/features/objectives/components/access-editor';
import { CategorySelect } from '@/features/objectives/components/category-select';
import { DateField } from '@/features/objectives/components/date-field';
import { NONE_CATEGORY, type ObjectiveFormValues } from '@/features/objectives/schemas/objective';
import { useTranslations } from 'next-intl';

const DIRECTIONS = ['increase', 'decrease'] as const;

export function ObjectiveFormFields({
    form,
    keptDeadline = '',
    currentCategory,
    withAccess = false,
}: {
    form: TanStackFormApi<ObjectiveFormValues>;
    keptDeadline?: string;
    // The objective's own category, which may not be on the pages loaded so far.
    currentCategory?: { id: Id<'categories'>; name: string };
    // Who can see and edit it is chosen when creating; afterwards it has its own dialog.
    withAccess?: boolean;
}) {
    const t = useTranslations('Objectives');
    // The calendar offers today onwards, or the deadline an overdue objective already keeps.
    const today = todayDateInput();
    const minDeadline = keptDeadline && keptDeadline < today ? keptDeadline : today;

    return (
        <FieldGroup>
            <TitleField form={form} />
            <form.Field name="description">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>{t('tableDescription')}</FieldLabel>
                            <Textarea
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                placeholder={t('describeObjectiveInDetail')}
                                maxLength={OBJECTIVE_DESCRIPTION_MAX_LENGTH}
                                onBlur={field.handleBlur}
                                onChange={event => field.handleChange(event.target.value)}
                                aria-invalid={isInvalid}
                                data-testid="objective-description-input"
                            />
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
            <form.Field name="categoryId">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>{t('category')}</FieldLabel>
                            <CategorySelect
                                id={field.name}
                                value={field.state.value}
                                onValueChange={field.handleChange}
                                onBlur={field.handleBlur}
                                firstOption={{ value: NONE_CATEGORY, label: t('noCategory') }}
                                currentCategory={currentCategory}
                                placeholder={t('selectACategory')}
                                isInvalid={isInvalid}
                                testId="objective-category-select"
                            />
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
            <form.Field name="unit">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>{t('unit')}</FieldLabel>
                            <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                placeholder={t('unitExample')}
                                maxLength={OBJECTIVE_UNIT_MAX_LENGTH}
                                onBlur={field.handleBlur}
                                onChange={event => field.handleChange(event.target.value)}
                                aria-invalid={isInvalid}
                                data-testid="objective-unit-input"
                            />
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
            <DirectionField form={form} />
            <NumberField
                form={form}
                name="startValue"
                label={t('initialValue')}
                testId="objective-start-input"
            />
            <NumberField
                form={form}
                name="targetValue"
                label={t('smartForm.fields.targetValueRequired')}
                testId="objective-target-input"
            />
            <form.Field name="deadline">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>{t('deadline')}</FieldLabel>
                            <DateField
                                id={field.name}
                                value={field.state.value}
                                onChange={field.handleChange}
                                onBlur={field.handleBlur}
                                min={minDeadline}
                                forwardDate
                                isInvalid={isInvalid}
                                testId="objective-deadline-input"
                            />
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
            <form.Subscribe selector={state => state.values.deadline !== ''}>
                {hasDeadline =>
                    hasDeadline ? (
                        <NumberField
                            form={form}
                            name="dueSoonDays"
                            label={t('dueSoonDays')}
                            description={t('dueSoonDaysDescription')}
                            min={1}
                            max={MAX_DUE_SOON_DAYS}
                            testId="objective-due-soon-input"
                        />
                    ) : null
                }
            </form.Subscribe>
            {withAccess ? (
                <form.Subscribe
                    selector={state => ({
                        memberAccess: state.values.memberAccess,
                        users: state.values.users,
                    })}
                >
                    {({ memberAccess, users }) => (
                        <AccessEditor
                            memberAccess={memberAccess}
                            onMemberAccessChange={value =>
                                form.setFieldValue('memberAccess', value)
                            }
                            users={users}
                            onUsersChange={value => form.setFieldValue('users', value)}
                        />
                    )}
                </form.Subscribe>
            ) : null}
        </FieldGroup>
    );
}

function DirectionField({ form }: { form: TanStackFormApi<ObjectiveFormValues> }) {
    const t = useTranslations('Objectives');

    return (
        <form.Field name="direction">
            {field => (
                <Field>
                    <FieldLabel id="direction-label">{t('direction.label')}</FieldLabel>
                    <RadioGroup
                        value={field.state.value}
                        onValueChange={value => {
                            if (value === 'increase' || value === 'decrease') {
                                field.handleChange(value);
                            }
                        }}
                        aria-labelledby="direction-label"
                        className="flex flex-wrap gap-4"
                        data-testid="objective-direction"
                    >
                        {DIRECTIONS.map(direction => (
                            <div key={direction} className="flex items-center gap-2">
                                <RadioGroupItem
                                    value={direction}
                                    id={`direction-${direction}`}
                                    data-testid={`objective-direction-${direction}`}
                                />
                                <Label htmlFor={`direction-${direction}`}>
                                    {t(`direction.${direction}`)}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                    <FieldDescription>{t('direction.description')}</FieldDescription>
                </Field>
            )}
        </form.Field>
    );
}

function NumberField({
    form,
    name,
    label,
    description,
    min,
    max,
    testId,
}: {
    form: TanStackFormApi<ObjectiveFormValues>;
    name: 'startValue' | 'targetValue' | 'dueSoonDays';
    label: string;
    description?: string;
    min?: number;
    max?: number;
    testId: string;
}) {
    return (
        <form.Field name={name}>
            {field => {
                const errors = getFieldErrors(form, field);
                const isInvalid = errors.length > 0;
                // An emptied input is stored as NaN so the schema reports it as required.
                const value = Number.isFinite(field.state.value) ? field.state.value : '';

                return (
                    <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
                        <Input
                            id={field.name}
                            name={field.name}
                            type="number"
                            step="any"
                            min={min}
                            max={max}
                            value={value}
                            onBlur={field.handleBlur}
                            onChange={event =>
                                field.handleChange(
                                    event.target.value === ''
                                        ? Number.NaN
                                        : Number(event.target.value)
                                )
                            }
                            aria-invalid={isInvalid}
                            data-testid={testId}
                        />
                        {description ? <FieldDescription>{description}</FieldDescription> : null}
                        {isInvalid ? <FieldError errors={errors} /> : null}
                    </Field>
                );
            }}
        </form.Field>
    );
}

function TitleField({ form }: { form: TanStackFormApi<ObjectiveFormValues> }) {
    const t = useTranslations('Objectives');

    return (
        <form.Field name="title">
            {field => {
                const errors = getFieldErrors(form, field);
                const isInvalid = errors.length > 0;
                const title = field.state.value;

                return (
                    <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                            {t('smartForm.fields.titleRequired')}
                        </FieldLabel>
                        <Input
                            id={field.name}
                            name={field.name}
                            value={title}
                            placeholder={t('enterObjectiveTitle')}
                            maxLength={OBJECTIVE_TITLE_MAX_LENGTH}
                            aria-describedby={`${field.name}-count`}
                            onBlur={field.handleBlur}
                            onChange={event => field.handleChange(event.target.value)}
                            aria-invalid={isInvalid}
                            data-testid="objective-title-input"
                        />
                        <div className="flex justify-between gap-4">
                            <FieldDescription>
                                {t('giveYourObjectiveAClearConciseTitle')}
                            </FieldDescription>
                            {/* The input stops at the limit, so show how close it is. */}
                            <span
                                id={`${field.name}-count`}
                                className="text-muted-foreground shrink-0 text-xs tabular-nums"
                                data-testid="objective-title-count"
                            >
                                {t('characterCount', {
                                    count: title.length,
                                    max: OBJECTIVE_TITLE_MAX_LENGTH,
                                })}
                            </span>
                        </div>
                        {isInvalid ? <FieldError errors={errors} /> : null}
                    </Field>
                );
            }}
        </form.Field>
    );
}
