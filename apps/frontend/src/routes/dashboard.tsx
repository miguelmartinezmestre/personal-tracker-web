import { createFileRoute } from '@tanstack/react-router';
import { AppSidebar } from '../components/app-sidebar';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '../components/ui/sidebar';
import { Separator } from '../components/ui/separator';
import { Graph1 } from '../components/graph1';
import { Graph2 } from '../components/graph2';
import { Graph3 } from '../components/graph3';
import { DataTable } from '../components/table';
import { ColumnDef } from '@tanstack/react-table';
import useAuth from '../hooks/useAuth';
import { DashboardLayout } from '../components/dashboard-layout';

export const Route = createFileRoute('/dashboard')({
    component: RouteComponent,
});

export type Goal = {
    id: number;
    userId: number;
    title: string;
    description: string;
    category: string;
    targetValue: number;
    currentValue: number;
    deadline: Date;
    status: string;
    unit: string;
};

export const columns: ColumnDef<Goal>[] = [
    {
        accessorKey: 'title',
        header: 'Title',
    },
    {
        accessorKey: 'description',
        header: 'Description',
    },
    {
        accessorKey: 'category',
        header: 'Category',
    },
    {
        accessorKey: 'targetValue',
        header: 'Target Value',
    },
    {
        accessorKey: 'currentValue',
        header: 'Current Value',
    },
    {
        accessorKey: 'deadline',
        header: 'Deadline',
    },
    {
        accessorKey: 'status',
        header: 'Status',
    },
    {
        accessorKey: 'unit',
        header: 'Unit',
    },
];

const data: Goal[] = [
    {
        id: 1,
        userId: 101,
        title: 'Run a Marathon',
        description: 'Complete a full marathon in 6 months.',
        category: 'Fitness',
        targetValue: 42.195,
        currentValue: 10,
        deadline: new Date('2025-06-01'),
        status: 'In Progress',
        unit: 'km',
    },
    {
        id: 2,
        userId: 102,
        title: 'Save for a Vacation',
        description: 'Save money for a trip to Europe.',
        category: 'Finance',
        targetValue: 5000,
        currentValue: 1200,
        deadline: new Date('2025-12-31'),
        status: 'In Progress',
        unit: 'USD',
    },
    {
        id: 3,
        userId: 103,
        title: 'Learn TypeScript',
        description: 'Complete an advanced TypeScript course.',
        category: 'Education',
        targetValue: 10,
        currentValue: 4,
        deadline: new Date('2024-03-15'),
        status: 'In Progress',
        unit: 'lessons',
    },
];
function RouteComponent() {
    const auth = useAuth();
    // console.log(auth);

    // if(email && name && email !== '' && name !== '') {
    //     return <div>Hello, {name}</div>;
    // }

    return (
        <DashboardLayout>
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                <div className="aspect-video rounded-xl bg-muted/50">
                    <Graph1 />
                </div>
                <div className="aspect-video rounded-xl bg-muted/50">
                    <Graph2 />
                </div>
                <div className="aspect-video rounded-xl bg-muted/50">
                    <Graph3 />
                </div>
            </div>
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
                <DataTable columns={columns} data={data} />;
            </div>
        </DashboardLayout>
    );
}
