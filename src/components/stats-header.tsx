
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatsHeaderProps {
    totalObjectives: number;
    completedObjectives: number;
    pendingObjectives: number;
}


export default function StatsHeader({ totalObjectives, completedObjectives, pendingObjectives }: StatsHeaderProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className='text-center'>
                <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Objetivos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold mb-2">{totalObjectives}</div>
                    <p className="text-xs text-muted-foreground">Objetivos activos</p>
                </CardContent>
            </Card>

            <Card className='text-center'>
                <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold mb-2">{pendingObjectives}</div>
                    <p className="text-xs text-muted-foreground">Objetivos logrados</p>
                </CardContent>
            </Card>


            <Card className='text-center'>
                <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completados</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold mb-2">{completedObjectives}</div>
                    <p className="text-xs text-muted-foreground">Objetivos logrados</p>
                </CardContent>
            </Card>

        </div>
    )

}

