'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { FieldDescription, FieldLabel } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const MEMBER_ACCESS_LEVELS = ['none', 'view', 'edit'] as const;

const USER_ACCESS_LEVELS = ['view', 'edit'] as const;

export type MemberAccess = (typeof MEMBER_ACCESS_LEVELS)[number];

export type UserAccess = { userId: Id<'user'>; name: string; access: 'view' | 'edit' };

/**
 * Who sees and edits an objective besides its creator, the owner and the admins: the member role
 * as a whole and specific users (decision 3). Edit always includes view.
 */
export function AccessEditor({
    memberAccess,
    onMemberAccessChange,
    users,
    onUsersChange,
}: {
    memberAccess: MemberAccess;
    onMemberAccessChange: (access: MemberAccess) => void;
    users: UserAccess[];
    onUsersChange: (users: UserAccess[]) => void;
}) {
    const t = useTranslations('Objectives.access');

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <FieldLabel id="member-access-label">{t('memberRole')}</FieldLabel>
                <RadioGroup
                    value={memberAccess}
                    onValueChange={value => {
                        const level = MEMBER_ACCESS_LEVELS.find(option => option === value);

                        if (level) {
                            onMemberAccessChange(level);
                        }
                    }}
                    aria-labelledby="member-access-label"
                    className="space-y-2"
                    data-testid="objective-member-access"
                >
                    {MEMBER_ACCESS_LEVELS.map(level => (
                        <div key={level} className="flex items-start gap-2">
                            <RadioGroupItem
                                value={level}
                                id={`member-access-${level}`}
                                className="mt-0.5"
                                data-testid={`objective-member-access-${level}`}
                            />
                            <Label htmlFor={`member-access-${level}`} className="font-normal">
                                {t(`memberLevels.${level}`)}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
                <FieldDescription>{t('alwaysFull')}</FieldDescription>
            </div>
            <div className="space-y-3">
                <FieldLabel>{t('users')}</FieldLabel>
                {users.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('noUsers')}</p>
                ) : (
                    <ul className="space-y-2" data-testid="objective-user-access-list">
                        {users.map(user => (
                            <li key={user.userId} className="flex items-center gap-2">
                                <span className="min-w-0 flex-1 truncate">{user.name}</span>
                                <LevelSelect
                                    value={user.access}
                                    label={t('levelFor', { name: user.name })}
                                    onChange={access =>
                                        onUsersChange(
                                            users.map(entry =>
                                                entry.userId === user.userId
                                                    ? { ...entry, access }
                                                    : entry
                                            )
                                        )
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('remove', { name: user.name })}
                                    onClick={() =>
                                        onUsersChange(
                                            users.filter(entry => entry.userId !== user.userId)
                                        )
                                    }
                                >
                                    <Trash2 aria-hidden />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
                <AddUser
                    excluded={users.map(user => user.userId)}
                    onAdd={user => onUsersChange([...users, user])}
                />
            </div>
        </div>
    );
}

function LevelSelect({
    value,
    label,
    onChange,
    testId,
}: {
    value: 'view' | 'edit';
    label: string;
    onChange: (access: 'view' | 'edit') => void;
    testId?: string;
}) {
    const t = useTranslations('Objectives.access');

    const items = USER_ACCESS_LEVELS.map(level => ({
        value: level,
        label: t(`userLevels.${level}`),
    }));

    return (
        <Select
            value={value}
            items={items}
            onValueChange={next => {
                const level = USER_ACCESS_LEVELS.find(option => option === next);

                if (level) {
                    onChange(level);
                }
            }}
        >
            <SelectTrigger aria-label={label} data-testid={testId}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {items.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                        {item.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function AddUser({
    excluded,
    onAdd,
}: {
    excluded: Id<'user'>[];
    onAdd: (user: UserAccess) => void;
}) {
    const t = useTranslations('Objectives.access');
    const common = useTranslations('Common');
    const session = useQuery(convexQuery(api.organizations.getCurrentSession, {}));
    const organizationId = session.data?.session.activeOrganizationId;
    const [selected, setSelected] = useState<string | null>(null);
    const [access, setAccess] = useState<'view' | 'edit'>('view');

    const members = usePaginatedList(
        api.organizations.getOrganizationMembers,
        organizationId ? { organizationId } : 'skip'
    );

    const options = members.data
        .filter(member => member.user && !excluded.includes(member.userId))
        .map(member => ({
            value: member.userId,
            label: member.user?.name || member.user?.email || '',
        }));

    const chosen = options.find(option => option.value === selected);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Select value={chosen?.value ?? null} items={options} onValueChange={setSelected}>
                <SelectTrigger
                    aria-label={t('selectUser')}
                    data-testid="objective-user-access-select"
                >
                    <SelectValue placeholder={t('selectUser')} />
                </SelectTrigger>
                <SelectContent>
                    {options.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        disabled={!members.canLoadMore || members.isFetching}
                        onClick={members.loadMore}
                    >
                        {members.isFetching && <Loader2 className="animate-spin" aria-hidden />}
                        {common('actions.loadMore')}
                    </Button>
                </SelectContent>
            </Select>
            <LevelSelect
                value={access}
                label={t('newUserLevel')}
                onChange={setAccess}
                testId="objective-user-access-level"
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!chosen}
                onClick={() => {
                    if (chosen) {
                        onAdd({ userId: chosen.value, name: chosen.label, access });
                        setSelected(null);
                    }
                }}
                data-testid="objective-user-access-add"
            >
                {t('add')}
            </Button>
        </div>
    );
}
