import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { DataTable } from '../src/components/table';

describe('Login Component', () => {
    it('renders correctly', () => {
        render(<DataTable columns={[]} data={[]} />);
    });

    it('should render the table', () => {
        render(<DataTable columns={[]} data={[]} />);
        expect(screen.getByRole('table')).toBeTruthy();
    });
});
