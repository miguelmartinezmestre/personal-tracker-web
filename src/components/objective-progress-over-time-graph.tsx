"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

type Progress = {
    date: string
    currentValue: number
    objective: number
}

interface ProgressProps {
    data: Progress[]
}

// const progressData = [
//     { date: "2024-01-01", currentValue: 10, objective: 80 },
//     { date: "2024-02-01", currentValue: 25, objective: 80 },
//     { date: "2024-03-01", currentValue: 40, objective: 80 },
//     { date: "2024-04-01", currentValue: 55, objective: 80 },
//     { date: "2024-05-01", currentValue: 65, objective: 80 },
//     { date: "2024-06-01", currentValue: 75, objective: 80 },
// ]

const chartConfig = {
    currentValue: {
        label: "Progreso Actual",
        color: "hsl(var(--chart-1))",
    },
    objective: {
        label: "Objetivo",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig

export default function ObjectiveProgressOverTimeChart({ data = [] }: ProgressProps) {
    return (
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <LineChart
                accessibilityLayer
                data={data}
                margin={{
                    top: 20,
                    left: 12,
                    right: 12,
                    bottom: 20,
                }}
            >
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => {
                        const date = new Date(value)
                        return date
                            .toLocaleDateString("es-ES", {
                                month: "short",
                            })
                            .replace(".", "")
                    }}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, 100]} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="currentValue" type="monotone" stroke="var(--color-currentValue)" strokeWidth={2} dot={true} />
                <Line
                    dataKey="objective"
                    type="monotone"
                    stroke="var(--color-objective)"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={false}
                />
            </LineChart>
        </ChartContainer>
    )
}
