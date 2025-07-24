"use client"

import { Pie, PieChart, Cell } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

interface ObjectivesStatusChartProps {
  completed: number
  pending: number
}

const chartConfig = {
  completed: {
    label: "Completed",
    color: "oklch(0 0 0)",
  },
  pending: {
    label: "Pending",
    color: "oklch(0.8 0 0)",
  },
} satisfies ChartConfig

export function ObjectivesStatusChart({ completed, pending }: ObjectivesStatusChartProps) {
  const total = completed + pending
  const chartData = [
    { name: "completed", value: completed, fill: "oklch(0 0 0)" },
    { name: "pending", value: pending, fill: "oklch(0.8 0 0)" },
  ]

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>Objectives Status</CardTitle>
        <CardDescription>Completed vs. Pending</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              strokeWidth={5}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill}/>
              ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <div className="flex flex-col items-center justify-center text-center p-4 mt-auto border-t">
        <p className="text-sm text-muted-foreground">Total Objectives</p>
        <p className="text-2xl font-bold">{total}</p>
      </div>
    </Card>
  )
}
