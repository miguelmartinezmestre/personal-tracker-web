import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CategoriesLayout from './categories-layout';

const { categoriesState, categoriesTableMock } = vi.hoisted(() => ({
    categoriesState: [{ id: 'cat-1', name: 'Work' }],
    categoriesTableMock: vi.fn(),
}));

vi.mock('@convex-dev/better-auth/nextjs/client', () => ({
    usePreloadedAuthQuery: () => categoriesState,
}));

vi.mock('./categories-table', () => ({
    default: (props: any) => {
        categoriesTableMock(props);
        return <div data-testid="categories-table">Categories table</div>;
    },
}));

vi.mock('./category-form-create-modal', () => ({
    default: () => <button data-testid="category-create-open">Create category</button>,
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => {
        const labels: Record<string, string> = {
            title: 'Categories',
        };

        return labels[key] ?? key;
    },
}));

describe('CategoriesLayout', () => {
    beforeEach(() => {
        categoriesTableMock.mockReset();
    });

    it('renders categories page and forwards query data to table', () => {
        render(<CategoriesLayout preloadedCategoriesQuery={{} as never} />);

        expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
        expect(screen.getByTestId('category-create-open')).toBeInTheDocument();
        expect(screen.getByTestId('categories-table')).toBeInTheDocument();
        expect(categoriesTableMock).toHaveBeenCalledWith({
            initialCategories: categoriesState,
        });
    });
});
