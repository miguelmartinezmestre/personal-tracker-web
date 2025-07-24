"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

interface MonthlyProgressChartProps {
  data: {
    month: string
    count: number
  }[]
}

const chartConfig = {
  count: {
    label: "Progress",
    color: "oklch(var(--chart-1))",
  },
} satisfies ChartConfig

export function MonthlyProgressChart({ data }: MonthlyProgressChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Monthly Progress</CardTitle>
        <CardDescription>Progress units added per month</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
