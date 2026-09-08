import { expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import es from '../../../translations/es.json';
import { DataTable } from './table';

test('failed queries show an error and retry instead of an empty table', async () => {
    const retry = vi.fn();
    render(
        <NextIntlClientProvider locale="es" messages={es}>
            <DataTable columns={[]} data={[]} isError error={new Error('Failed')} onRetry={retry} />
        </NextIntlClientProvider>
    );
    expect(screen.getByRole('alert')).toHaveTextContent(es.Common.queryError);
    await userEvent.click(screen.getByRole('button', { name: es.Common.actions.retry }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
