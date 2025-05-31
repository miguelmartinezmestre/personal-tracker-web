import { ProgressUpdatesAddedPerMonthGraph } from '@/components/progress-updates-added-per-month-graph';
import { RemainDaysToDeadlineGraph } from '@/components/remain-days-to-deadline-graph';
import ObjetivesTable from '@/components/objectives/objetives-table';
import StatsHeader from '@/components/stats-header';

import getUser from '@/server/getUser';
import { getQueryClient, prefetch, trpc } from '@/trpc/server';
import { Role } from '@prisma/client';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ObjetivesMostProgressGraph } from '@/components/objectives-most-progress-graph';

function t(key: string) {
    return key;
}

// Datos de ejemplo basados en tu schema
const mockObjectives = [
    {
        id: 1,
        title: "Perder 10kg",
        category: "Salud",
        targetValue: 10,
        currentValue: 6.5,
        unit: "kg",
        status: "active",
        deadline: "2024-06-30",
        progressUpdates: [
            { updateDate: "2024-01-15", updatedValue: 2 },
            { updateDate: "2024-02-15", updatedValue: 4 },
            { updateDate: "2024-03-15", updatedValue: 5.5 },
            { updateDate: "2024-04-15", updatedValue: 6.5 },
        ],
    },
    {
        id: 2,
        title: "Leer 24 libros",
        category: "Educación",
        targetValue: 24,
        currentValue: 18,
        unit: "libros",
        status: "active",
        deadline: "2024-12-31",
        progressUpdates: [
            { updateDate: "2024-01-31", updatedValue: 4 },
            { updateDate: "2024-02-28", updatedValue: 8 },
            { updateDate: "2024-03-31", updatedValue: 12 },
            { updateDate: "2024-04-30", updatedValue: 18 },
        ],
    },
    {
        id: 3,
        title: "Ahorrar $5000",
        category: "Finanzas",
        targetValue: 5000,
        currentValue: 3200,
        unit: "$",
        status: "active",
        deadline: "2024-12-31",
        progressUpdates: [
            { updateDate: "2024-01-31", updatedValue: 800 },
            { updateDate: "2024-02-28", updatedValue: 1600 },
            { updateDate: "2024-03-31", updatedValue: 2400 },
            { updateDate: "2024-04-30", updatedValue: 3200 },
        ],
    },
    {
        id: 4,
        title: "Correr 500km",
        category: "Fitness",
        targetValue: 500,
        currentValue: 320,
        unit: "km",
        status: "active",
        deadline: "2024-12-31",
        progressUpdates: [
            { updateDate: "2024-01-31", updatedValue: 80 },
            { updateDate: "2024-02-28", updatedValue: 160 },
            { updateDate: "2024-03-31", updatedValue: 240 },
            { updateDate: "2024-04-30", updatedValue: 320 },
        ],
    },
]

// Datos para gráfica de progreso temporal
const progressTimelineData = mockObjectives[0].progressUpdates.map((update, index) => ({
    date: new Date(update.updateDate).toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
    progreso: (update.updatedValue / mockObjectives[0].targetValue) * 100,
    valor: update.updatedValue,
}))

// Datos para comparación de objetivos
const objectivesComparisonData = mockObjectives.map((obj) => ({
    objetivo: obj.title.length > 15 ? obj.title.substring(0, 15) + "..." : obj.title,
    progreso: (obj.currentValue / obj.targetValue) * 100,
    completado: obj.currentValue,
    objetivo_total: obj.targetValue,
}))

// Datos para distribución por categorías
const categoryData = mockObjectives.reduce((acc, obj) => {
    const existing = acc.find((item) => item.categoria === obj.category)
    if (existing) {
        existing.cantidad += 1
        existing.progreso_promedio = (existing.progreso_promedio + (obj.currentValue / obj.targetValue) * 100) / 2
    } else {
        acc.push({
            categoria: obj.category,
            cantidad: 1,
            progreso_promedio: (obj.currentValue / obj.targetValue) * 100,
        })
    }
    return acc
}, [] as any[])



const totalObjectives = mockObjectives.length
const completedObjectives = mockObjectives.filter((obj) => obj.currentValue / obj.targetValue >= 1).length
const averageProgress =
    (mockObjectives.reduce((acc, obj) => acc + obj.currentValue / obj.targetValue, 0) / totalObjectives) * 100

export default async function Dashboard() {

    const { name, email, id, role } = await getUser();

    const queryClient = getQueryClient();

    prefetch(trpc.objectives.getObjectivesByUser.queryOptions({}));

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <h1 className="text-2xl font-bold" data-testid="welcome-message">Welcome {name}</h1>
            <StatsHeader totalObjectives={totalObjectives} completedObjectives={completedObjectives} averageProgress={averageProgress} categoryData={categoryData.length} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <ProgressUpdatesAddedPerMonthGraph />
                <RemainDaysToDeadlineGraph />
                <ObjetivesMostProgressGraph />
            </div>
            <div>
                <ObjetivesTable />
            </div>
        </HydrationBoundary>
    );
}
