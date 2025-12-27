'use client';

import * as React from 'react';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Badge } from '@repo/ui/components/badge';
import { Card, CardContent, CardHeader } from '@repo/ui/components/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@repo/ui/components/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@repo/ui/components/dialog';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
    useCategories,
    useCreateCategory,
    useUpdateCategory,
    useDeleteCategory,
    useCreateDefaultCategories,
} from '@/hooks/api/use-categories';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Id } from '@repo/backend/convex/_generated/dataModel';

interface Category {
    _id: Id<'categories'>;
    user: string;
    name: string;
    color: string;
    icon?: string;
    createdAt: number;
    updatedAt: number;
}

const COLORS = [
    { value: '#ef4444', labelKey: 'colors.red', className: 'bg-red-500' },
    { value: '#f97316', labelKey: 'colors.orange', className: 'bg-orange-500' },
    { value: '#eab308', labelKey: 'colors.yellow', className: 'bg-yellow-500' },
    { value: '#22c55e', labelKey: 'colors.green', className: 'bg-green-500' },
    { value: '#06b6d4', labelKey: 'colors.teal', className: 'bg-teal-500' },
    { value: '#3b82f6', labelKey: 'colors.blue', className: 'bg-blue-500' },
    { value: '#8b5cf6', labelKey: 'colors.purple', className: 'bg-purple-500' },
    { value: '#ec4899', labelKey: 'colors.pink', className: 'bg-pink-500' },
    { value: '#6b7280', labelKey: 'colors.gray', className: 'bg-gray-500' },
];

const ICONS = [
    'tag',
    'heart',
    'briefcase',
    'book',
    'user',
    'dollar-sign',
    'users',
    'palette',
    'home',
    'map',
    'target',
    'trending-up',
    'star',
    'award',
    'zap',
    'coffee',
    'music',
    'camera',
    'plane',
];

interface CategoryManagerProps {
    className?: string;
}

const CategoryManager = React.forwardRef<HTMLDivElement, CategoryManagerProps>(
    ({ className }, ref) => {
        const t = useTranslations('Objectives');
        const tCommon = useTranslations('Common');

        const [isCreateOpen, setIsCreateOpen] = React.useState(false);
        const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
        const [newCategory, setNewCategory] = React.useState({
            name: '',
            color: '#3b82f6',
            icon: 'tag',
        });

        const queryClient = useQueryClient();

        const { data: categories = [] } = useCategories();

        const createCategoryMutation = useCreateCategory();
        const updateCategoryMutation = useUpdateCategory();
        const deleteCategoryMutation = useDeleteCategory();
        const createDefaultCategoriesMutation = useCreateDefaultCategories();

        const handleCreateCategory = () => {
            if (!newCategory.name.trim()) return;
            createCategoryMutation.mutate(newCategory, {
                onSuccess: () => {
                    toast.success(t('categories.toast.createSuccess'));
                    setNewCategory({ name: '', color: '#3b82f6', icon: 'tag' });
                    setIsCreateOpen(false);
                },
                onError: (error: Error) => {
                    toast.error(t('categories.toast.createFailed'));
                    console.error(error);
                },
            });
        };

        const handleUpdateCategory = () => {
            if (!editingCategory) return;
            updateCategoryMutation.mutate(
                {
                    id: editingCategory._id,
                    name: editingCategory.name,
                    color: editingCategory.color,
                    icon: editingCategory.icon,
                },
                {
                    onSuccess: () => {
                        toast.success(t('categories.toast.updateSuccess'));
                        setEditingCategory(null);
                    },
                    onError: (error: Error) => {
                        toast.error(t('categories.toast.updateFailed'));
                        console.error(error);
                    },
                }
            );
        };

        const handleDeleteCategory = (id: Id<'categories'>) => {
            if (confirm(t('categories.confirmDelete'))) {
                deleteCategoryMutation.mutate(
                    { id },
                    {
                        onSuccess: () => {
                            toast.success(t('categories.toast.deleteSuccess'));
                        },
                        onError: (error: Error) => {
                            toast.error(t('categories.toast.deleteFailed'));
                            console.error(error);
                        },
                    }
                );
            }
        };

        return (
            <div ref={ref} className={className}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Tag className="h-5 w-5" />
                        <h2 className="text-lg font-semibold">{t('categories.title')}</h2>
                    </div>

                    <div className="flex items-center space-x-2">
                        {categories.length === 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    createDefaultCategoriesMutation.mutate(
                                        {},
                                        {
                                            onSuccess: () => {
                                                toast.success(t('categories.toast.createDefaultsSuccess'));
                                            },
                                            onError: (error: Error) => {
                                                toast.error(t('categories.toast.createDefaultsFailed'));
                                                console.error(error);
                                            },
                                        }
                                    )
                                }
                                disabled={createDefaultCategoriesMutation.isPending}
                            >
                                {t('categories.addDefault')}
                            </Button>
                        )}

                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t('categories.new')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('categories.createTitle')}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">
                                            {t('categories.fields.name')}
                                        </label>
                                        <Input
                                            value={newCategory.name}
                                            onChange={e =>
                                                setNewCategory(prev => ({
                                                    ...prev,
                                                    name: e.target.value,
                                                }))
                                            }
                                            placeholder={t('categories.placeholders.name')}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium">
                                                {t('categories.fields.color')}
                                            </label>
                                            <Select
                                                value={newCategory.color}
                                                onValueChange={color =>
                                                    setNewCategory(prev => ({ ...prev, color }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue>
                                                        <div className="flex items-center space-x-2">
                                                            <div
                                                                className="w-4 h-4 rounded"
                                                                style={{
                                                                    backgroundColor:
                                                                        newCategory.color,
                                                                }}
                                                            />
                                                            <span>
                                                                {(() => {
                                                                    const labelKey = COLORS.find(
                                                                        c =>
                                                                            c.value ===
                                                                            newCategory.color
                                                                    )?.labelKey;
                                                                    return labelKey
                                                                        ? tCommon(labelKey)
                                                                        : '';
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {COLORS.map(color => (
                                                        <SelectItem
                                                            key={color.value}
                                                            value={color.value}
                                                        >
                                                            <div className="flex items-center space-x-2">
                                                                <div
                                                                    className={`w-4 h-4 rounded ${color.className}`}
                                                                />
                                                                <span>
                                                                    {tCommon(color.labelKey)}
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium">
                                                {t('categories.fields.icon')}
                                            </label>
                                            <Select
                                                value={newCategory.icon}
                                                onValueChange={icon =>
                                                    setNewCategory(prev => ({ ...prev, icon }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder={t(
                                                            'categories.placeholders.selectIcon'
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ICONS.map(icon => (
                                                        <SelectItem key={icon} value={icon}>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="capitalize">
                                                                    {tCommon(`icons.${icon}`)}
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsCreateOpen(false)}
                                        >
                                            {t('categories.buttons.cancel')}
                                        </Button>
                                        <Button
                                            onClick={handleCreateCategory}
                                            disabled={
                                                createCategoryMutation.isPending || !newCategory.name.trim()
                                            }
                                        >
                                            {createCategoryMutation.isPending
                                                ? t('categories.buttons.creating')
                                                : t('categories.buttons.create')}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Categories Grid */}
                {categories.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                                {t('categories.emptyTitle')}
                            </h3>
                            <p className="text-muted-foreground text-center mb-4">
                                {t('categories.emptyDescription')}
                            </p>
                            <Button
                                onClick={() =>
                                    createDefaultCategoriesMutation.mutate(
                                        {},
                                        {
                                            onSuccess: () => {
                                                toast.success(t('categories.toast.createDefaultsSuccess'));
                                            },
                                            onError: (error: Error) => {
                                                toast.error(t('categories.toast.createDefaultsFailed'));
                                                console.error(error);
                                            },
                                        }
                                    )
                                }
                            >
                                {t('categories.addDefault')}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map(category => (
                            <Card key={category._id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-4 h-4 rounded"
                                                style={{ backgroundColor: category.color }}
                                            />
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                                style={{
                                                    backgroundColor: category.color + '20',
                                                    borderColor: category.color,
                                                    color: category.color,
                                                }}
                                            >
                                                {category.name}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditingCategory(category)}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteCategory(category._id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Edit Category Dialog */}
                <Dialog
                    open={!!editingCategory}
                    onOpenChange={open => !open && setEditingCategory(null)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('categories.editTitle')}</DialogTitle>
                        </DialogHeader>
                        {editingCategory && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">
                                        {t('categories.fields.name')}
                                    </label>
                                    <Input
                                        value={editingCategory.name}
                                        onChange={e =>
                                            setEditingCategory(prev =>
                                                prev ? { ...prev, name: e.target.value } : null
                                            )
                                        }
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">
                                            {t('categories.fields.color')}
                                        </label>
                                        <Select
                                            value={editingCategory.color}
                                            onValueChange={color =>
                                                setEditingCategory(prev =>
                                                    prev ? { ...prev, color } : null
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue>
                                                    <div className="flex items-center space-x-2">
                                                        <div
                                                            className="w-4 h-4 rounded"
                                                            style={{
                                                                backgroundColor:
                                                                    editingCategory.color,
                                                            }}
                                                        />
                                                        <span>
                                                            {(() => {
                                                                const labelKey = COLORS.find(
                                                                    c =>
                                                                        c.value ===
                                                                        editingCategory.color
                                                                )?.labelKey;
                                                                return labelKey
                                                                    ? tCommon(labelKey)
                                                                    : '';
                                                            })()}
                                                        </span>
                                                    </div>
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COLORS.map(color => (
                                                    <SelectItem
                                                        key={color.value}
                                                        value={color.value}
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <div
                                                                className={`w-4 h-4 rounded ${color.className}`}
                                                            />
                                                            <span>{tCommon(color.labelKey)}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">
                                            {t('categories.fields.icon')}
                                        </label>
                                        <Select
                                            value={editingCategory.icon || 'tag'}
                                            onValueChange={icon =>
                                                setEditingCategory(prev =>
                                                    prev ? { ...prev, icon } : null
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ICONS.map(icon => (
                                                    <SelectItem key={icon} value={icon}>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="capitalize">
                                                                {tCommon(`icons.${icon}`)}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setEditingCategory(null)}
                                    >
                                        {t('categories.buttons.cancel')}
                                    </Button>
                                    <Button
                                        onClick={handleUpdateCategory}
                                        disabled={updateCategoryMutation.isPending}
                                    >
                                        {updateCategoryMutation.isPending
                                            ? t('categories.buttons.updating')
                                            : t('categories.buttons.update')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        );
    }
);
CategoryManager.displayName = 'CategoryManager';

export { CategoryManager };
