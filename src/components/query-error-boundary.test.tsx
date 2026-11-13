import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import es from '../translations/es.json';
import { QueryErrorBoundary } from './query-error-boundary';

test('a failed list shows an error with a retry while the rest of the page stays @REQ-NF-010', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let failing = true;

    function List() {
        if (failing) {
            throw new Error('QUERY_FAILED');
        }

        return <p>Loaded</p>;
    }

    render(
        <NextIntlClientProvider locale="es" messages={es}>
            <h1>Page</h1>
            <QueryErrorBoundary>
                <List />
            </QueryErrorBoundary>
        </NextIntlClientProvider>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(es.Common.queryError);
    expect(screen.getByRole('heading', { name: 'Page' })).toBeInTheDocument();

    failing = false;
    await userEvent.click(screen.getByRole('button', { name: es.Common.actions.retry }));

    expect(screen.getByText('Loaded')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
