'use client';
import { useTranslations } from 'next-intl';

export function ChartDataTable({
    caption,
    columns,
    rows,
}: {
    caption: string;
    columns: readonly string[];
    rows: { id: string; values: readonly (string | number)[] }[];
}) {
    const t = useTranslations('Common');
    return (
        <details className="text-sm">
            <summary className="cursor-pointer rounded py-2 focus-visible:outline-2 focus-visible:outline-ring">
                {t('chartData')}
            </summary>
            <div className="overflow-x-auto" tabIndex={0}>
                <table className="w-full text-left">
                    <caption className="sr-only">{caption}</caption>
                    <thead>
                        <tr>
                            {columns.map(column => (
                                <th key={column} scope="col" className="border-b p-2">
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.id}>
                                {row.values.map((value, index) => (
                                    <td key={columns[index]} className="border-b p-2">
                                        {value}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </details>
    );
}
