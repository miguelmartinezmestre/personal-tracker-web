import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { useEffect, useRef, useState } from 'react';

export interface Progress {
    date: Date;
    currentValue: number;
    objetive: number;
}

interface ProgressProps {
    data?: Progress[];
}

const chartConfig = {
    currentValue: {
        label: 'Valor Actual',
        color: 'hsl(var(--chart-1))',
    },
    objetive: {
        label: 'Objetivo',
        color: 'hsl(var(--chart-2))',
    },
} satisfies ChartConfig;

// Datos de ejemplo en caso de que no se proporcionen
const fallbackData = [
    { date: new Date('2024-01-01'), currentValue: 5, objetive: 90 },
    { date: new Date('2024-02-01'), currentValue: 23, objetive: 90 },
    { date: new Date('2024-03-01'), currentValue: 32, objetive: 90 },
    { date: new Date('2024-04-01'), currentValue: 37, objetive: 90 },
    { date: new Date('2024-05-01'), currentValue: 45, objetive: 90 },
    { date: new Date('2024-06-01'), currentValue: 52, objetive: 90 },
];

export function Graph3({ data = fallbackData }: ProgressProps) {
    // Asegurarse de que hay datos para mostrar
    const chartData = data && data.length > 0 ? data : fallbackData;
    const [chartWidth, setChartWidth] = useState(0);
    const [chartHeight, setChartHeight] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Medir las dimensiones del contenedor al montar y cuando cambie el tamaño
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                // Solo actualizar si realmente cambian las dimensiones
                if (clientWidth !== chartWidth || clientHeight !== chartHeight) {
                    setChartWidth(clientWidth);
                    setChartHeight(clientHeight);
                }
            }
        };

        // Configurar observer para cambios de tamaño
        const resizeObserver = new ResizeObserver(() => {
            // Usar un pequeño retraso para evitar demasiadas actualizaciones
            setTimeout(updateDimensions, 100);
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
            // Inicial
            updateDimensions();
        }

        return () => resizeObserver.disconnect();
    }, [chartWidth, chartHeight]);

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Line Chart - Multiple</CardTitle>
                <CardDescription>January - June 2024</CardDescription>
            </CardHeader>
            <CardContent>
                <div ref={containerRef} className="w-full h-[300px] sm:h-[350px] md:h-[400px]">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                        {chartWidth > 0 && chartHeight > 0 ? (
                            <LineChart
                                width={chartWidth}
                                height={chartHeight}
                                data={chartData}
                                margin={{
                                    top: 20,
                                    right: 30,
                                    left: 20,
                                    bottom: 30,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={value =>
                                        new Date(value).toLocaleDateString('es-ES', {
                                            month: 'short',
                                        })
                                    }
                                    className="text-xs sm:text-sm"
                                />
                                <YAxis className="text-xs sm:text-sm" />
                                <ChartTooltip
                                    content={<ChartTooltipContent />}
                                    wrapperClassName="z-50"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="currentValue"
                                    stroke="var(--color-currentValue)"
                                    strokeWidth={2}
                                    activeDot={{ r: 8 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="objetive"
                                    stroke="var(--color-objetive)"
                                    strokeWidth={2}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        ) : (
                            <div />
                        )}
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    );
}
