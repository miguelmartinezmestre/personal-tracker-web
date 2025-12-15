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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { toast } from 'sonner';
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
    { value: '#ef4444', label: 'Red', className: 'bg-red-500' },
    { value: '#f97316', label: 'Orange', className: 'bg-orange-500' },
    { value: '#eab308', label: 'Yellow', className: 'bg-yellow-500' },
    { value: '#22c55e', label: 'Green', className: 'bg-green-500' },
    { value: '#06b6d4', label: 'Teal', className: 'bg-teal-500' },
    { value: '#3b82f6', label: 'Blue', className: 'bg-blue-500' },
    { value: '#8b5cf6', label: 'Purple', className: 'bg-purple-500' },
    { value: '#ec4899', label: 'Pink', className: 'bg-pink-500' },
    { value: '#6b7280', label: 'Gray', className: 'bg-gray-500' },
];

const ICONS = [
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
        const [isCreateOpen, setIsCreateOpen] = React.useState(false);
        const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
        const [newCategory, setNewCategory] = React.useState({
            name: '',
            color: '#3b82f6',
            icon: 'tag',
        });

        const queryClient = useQueryClient();

        const { data: categories = [] } = useQuery(
            convexQuery(api.categories.getCategoriesByUser, {})
        );

        const createCategory = useMutation({
            mutationFn: useConvexMutation(api.categories.createCategory),
            onSuccess: () => {
                toast.success('Category created successfully!');
                queryClient.invalidateQueries({ queryKey: ['categories'] });
                setNewCategory({ name: '', color: '#3b82f6', icon: 'tag' });
                setIsCreateOpen(false);
            },
            onError: (error: any) => {
                toast.error('Failed to create category');
                console.error(error);
            },
        });

        const updateCategory = useMutation({
            mutationFn: useConvexMutation(api.categories.updateCategory),
            onSuccess: () => {
                toast.success('Category updated successfully!');
                queryClient.invalidateQueries({ queryKey: ['categories'] });
                setEditingCategory(null);
            },
            onError: (error: any) => {
                toast.error('Failed to update category');
                console.error(error);
            },
        });

        const deleteCategory = useMutation({
            mutationFn: useConvexMutation(api.categories.deleteCategory),
            onSuccess: () => {
                toast.success('Category deleted successfully!');
                queryClient.invalidateQueries({ queryKey: ['categories'] });
            },
            onError: (error: any) => {
                toast.error('Failed to delete category');
                console.error(error);
            },
        });

        const createDefaultCategories = useMutation({
            mutationFn: useConvexMutation(api.categories.createDefaultCategories),
            onSuccess: () => {
                toast.success('Default categories created!');
                queryClient.invalidateQueries({ queryKey: ['categories'] });
            },
            onError: (error: any) => {
                toast.error('Failed to create default categories');
                console.error(error);
            },
        });

        const handleCreateCategory = () => {
            if (!newCategory.name.trim()) return;
            createCategory.mutate(newCategory);
        };

        const handleUpdateCategory = () => {
            if (!editingCategory) return;
            updateCategory.mutate({
                id: editingCategory._id,
                name: editingCategory.name,
                color: editingCategory.color,
                icon: editingCategory.icon,
            });
        };

        const handleDeleteCategory = (id: Id<'categories'>) => {
            if (confirm('Are you sure you want to delete this category?')) {
                deleteCategory.mutate({ id });
            }
        };

        return (
            <div ref={ref} className={className}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Tag className="h-5 w-5" />
                        <h2 className="text-lg font-semibold">Categories</h2>
                    </div>

                    <div className="flex items-center space-x-2">
                        {(categories as any[]).length === 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => createDefaultCategories.mutate({})}
                                disabled={createDefaultCategories.isPending}
                            >
                                Add Default Categories
                            </Button>
                        )}

                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Category
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Category</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Name</label>
                                        <Input
                                            value={newCategory.name}
                                            onChange={e =>
                                                setNewCategory(prev => ({
                                                    ...prev,
                                                    name: e.target.value,
                                                }))
                                            }
                                            placeholder="Enter category name..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium">Color</label>
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
                                                                {
                                                                    COLORS.find(
                                                                        c =>
                                                                            c.value ===
                                                                            newCategory.color
                                                                    )?.label
                                                                }
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
                                                                <span>{color.label}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium">Icon</label>
                                            <Select
                                                value={newCategory.icon}
                                                onValueChange={icon =>
                                                    setNewCategory(prev => ({ ...prev, icon }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select icon" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ICONS.map(icon => (
                                                        <SelectItem key={icon} value={icon}>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="capitalize">
                                                                    {icon}
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
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleCreateCategory}
                                            disabled={
                                                createCategory.isPending || !newCategory.name.trim()
                                            }
                                        >
                                            {createCategory.isPending ? 'Creating...' : 'Create'}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Categories Grid */}
                {(categories as any[]).length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No categories yet</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                Create categories to organize your objectives better.
                            </p>
                            <Button onClick={() => createDefaultCategories.mutate({})}>
                                Add Default Categories
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(categories as any[]).map((category: any) => (
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
                            <DialogTitle>Edit Category</DialogTitle>
                        </DialogHeader>
                        {editingCategory && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Name</label>
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
                                        <label className="text-sm font-medium">Color</label>
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
                                                            {
                                                                COLORS.find(
                                                                    c =>
                                                                        c.value ===
                                                                        editingCategory.color
                                                                )?.label
                                                            }
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
                                                            <span>{color.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">Icon</label>
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
                                                                {icon}
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
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleUpdateCategory}
                                        disabled={updateCategory.isPending}
                                    >
                                        {updateCategory.isPending ? 'Updating...' : 'Update'}
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
