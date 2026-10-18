'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SetupCategory } from '../schemas/setup-schema';
import { categoryIconSchema } from '@/features/categories/schemas/category';

const ICON_OPTIONS = categoryIconSchema.options;

interface StepCategoriesProps {
    data: SetupCategory[];
    onChange: (data: SetupCategory[]) => void;
}

export default function StepCategories({ data, onChange }: StepCategoriesProps) {
    const t = useTranslations('Setup');
    const tCommon = useTranslations('Common');
    const [newName, setNewName] = useState('');
    const nextCategoryKey = useRef(data.length);

    const [categoryKeys, setCategoryKeys] = useState(() =>
        data.map((_, index) => `setup-category-${index}`)
    );

    const updateCategory = (index: number, updates: Partial<SetupCategory>) => {
        const updated = data.map((category, categoryIndex) =>
            categoryIndex === index ? { ...category, ...updates } : category
        );

        onChange(updated);
    };

    const iconItems = ICON_OPTIONS.map(icon => ({
        value: icon,
        label: tCommon(`icons.${icon}`),
    }));

    const removeCategory = (index: number) => {
        onChange(data.filter((_, i) => i !== index));
        setCategoryKeys(keys => keys.filter((_, keyIndex) => keyIndex !== index));
    };

    const addCategory = () => {
        if (!newName.trim()) {
            return;
        }

        onChange([...data, { name: newName.trim(), color: '#6366F1', icon: 'tag' }]);
        const nextKey = `setup-category-${nextCategoryKey.current++}`;
        setCategoryKeys(keys => [...keys, nextKey]);
        setNewName('');
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{t('categories.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('categories.description')}</p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {data.map((category, index) => (
                    <div
                        key={categoryKeys[index]}
                        className="flex items-center gap-2 rounded-md border p-2"
                    >
                        <Input
                            value={category.name}
                            onChange={e => updateCategory(index, { name: e.target.value })}
                            className="flex-1"
                            aria-label={t('categories.nameLabel', { index: index + 1 })}
                            data-testid={`setup-category-name-${index}`}
                        />
                        <input
                            type="color"
                            value={category.color}
                            onChange={e => updateCategory(index, { color: e.target.value })}
                            className="h-9 w-9 cursor-pointer rounded border-0 p-0.5"
                            aria-label={t('categories.colorLabel', { name: category.name })}
                            data-testid={`setup-category-color-${index}`}
                        />
                        <Select
                            value={category.icon ?? 'tag'}
                            onValueChange={value => {
                                const parsed = categoryIconSchema.safeParse(value);

                                if (parsed.success) {
                                    updateCategory(index, { icon: parsed.data });
                                }
                            }}
                            items={iconItems}
                        >
                            <SelectTrigger
                                className="w-[110px]"
                                aria-label={t('categories.iconLabel', { name: category.name })}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ICON_OPTIONS.map(icon => (
                                    <SelectItem key={icon} value={icon}>
                                        {tCommon(`icons.${icon}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => removeCategory(index)}
                            disabled={data.length <= 1}
                            aria-label={t('categories.removeLabel', { name: category.name })}
                            data-testid={`setup-category-remove-${index}`}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="setup-category-new-name">{t('categories.addNew')}</Label>
                    <Input
                        id="setup-category-new-name"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder={t('categories.newPlaceholder')}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                addCategory();
                            }
                        }}
                        data-testid="setup-category-new-name"
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={addCategory}
                    disabled={!newName.trim()}
                >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('categories.add')}
                </Button>
            </div>
        </div>
    );
}
