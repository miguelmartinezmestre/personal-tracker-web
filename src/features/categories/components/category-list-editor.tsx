'use client';

import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategoryIconSelect } from '@/features/categories/components/category-icon-select';
import { categoryDraftSchema, type CategoryDraft } from '@/features/categories/schemas/category';

const NEW_CATEGORY_COLOR = '#6366F1';

/** Categories chosen from a proposal, to edit, remove or add to before saving them together. */
export function CategoryListEditor({
    value,
    onChange,
}: {
    value: CategoryDraft[];
    onChange: (value: CategoryDraft[]) => void;
}) {
    const t = useTranslations('Categories.editor');
    const newNameId = useId();
    const [newName, setNewName] = useState('');

    const updateCategory = (index: number, updates: Partial<CategoryDraft>) =>
        onChange(
            value.map((category, categoryIndex) =>
                categoryIndex === index ? { ...category, ...updates } : category
            )
        );

    const addCategory = () => {
        if (!newName.trim()) {
            return;
        }

        onChange([...value, { name: newName.trim(), color: NEW_CATEGORY_COLOR, icon: 'tag' }]);
        setNewName('');
    };

    return (
        <div className="space-y-4">
            {value.length === 0 && (
                <p className="text-muted-foreground text-sm" data-testid="category-draft-empty">
                    {t('empty')}
                </p>
            )}
            <ul className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
                {value.map((category, index) => (
                    // Every field is controlled, so index keys keep the right values on removal.
                    <li key={index} className="flex items-center gap-2 rounded-md border p-2">
                        <Input
                            value={category.name}
                            onChange={event => updateCategory(index, { name: event.target.value })}
                            className="flex-1"
                            aria-label={t('nameLabel', { index: index + 1 })}
                            aria-invalid={
                                !categoryDraftSchema.shape.name.safeParse(category.name).success
                            }
                            data-testid={`category-draft-name-${index}`}
                        />
                        <input
                            type="color"
                            value={category.color}
                            onChange={event => updateCategory(index, { color: event.target.value })}
                            className="h-9 w-9 cursor-pointer rounded border-0 p-0.5"
                            aria-label={t('colorLabel', { name: category.name })}
                        />
                        <CategoryIconSelect
                            value={category.icon}
                            onValueChange={icon => updateCategory(index, { icon })}
                            ariaLabel={t('iconLabel', { name: category.name })}
                            className="w-[130px]"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() =>
                                onChange(value.filter((_, otherIndex) => otherIndex !== index))
                            }
                            aria-label={t('removeLabel', { name: category.name })}
                            data-testid={`category-draft-remove-${index}`}
                        >
                            <Trash2 className="text-destructive h-4 w-4" />
                        </Button>
                    </li>
                ))}
            </ul>
            <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                    <Label htmlFor={newNameId}>{t('addNew')}</Label>
                    <Input
                        id={newNameId}
                        value={newName}
                        onChange={event => setNewName(event.target.value)}
                        placeholder={t('newPlaceholder')}
                        onKeyDown={event => {
                            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                                event.preventDefault();
                                addCategory();
                            }
                        }}
                        data-testid="category-draft-new-name"
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={addCategory}
                    disabled={!newName.trim()}
                    data-testid="category-draft-add"
                >
                    <Plus className="mr-1 h-4 w-4" />
                    {t('add')}
                </Button>
            </div>
        </div>
    );
}
