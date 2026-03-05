import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function StatCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number | undefined;
    icon: React.ComponentType<{ className?: string }>;
}) {
    return (
        <Card data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {value === undefined ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
                </div>
            </CardContent>
        </Card>
    );
}
