"use client"

import { Bar, BarChart, XAxis, YAxis, LabelList } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@repo/ui/components/chart"
import type { ChartConfig } from "@repo/ui/components/chart"

interface ObjetivesMostProgressGraphProps {
  data: {
    objective: string
    progress: number
  }[]
}

const chartConfig = {
  progress: {
    label: "Progress",
    color: "oklch(var(--chart-2))",
  },
} satisfies ChartConfig

export function ObjetivesMostProgressGraph({ data }: ObjetivesMostProgressGraphProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Objectives with Most Progress</CardTitle>
        <CardDescription>Top 5 objectives by progress completion</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 10, right: 40 }}>
            <YAxis
              dataKey="objective"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => (value.length > 25 ? `${value.substring(0, 25)}...` : value)}
              width={150}
            />
            <XAxis dataKey="progress" type="number" hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="progress" layout="vertical" fill="var(--color-progress)" radius={4}>
              <LabelList
                dataKey="progress"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                formatter={(value: number) => `${value}%`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
