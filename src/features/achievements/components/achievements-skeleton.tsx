import { Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_STATS = [1, 2, 3];
const SKELETON_CARDS = [1, 2, 3, 4, 5, 6];

export function AchievementsSkeleton() {
    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <Skeleton className="h-8 w-48" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {SKELETON_STATS.map(i => (
                    <Skeleton key={i} className="h-24" />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SKELETON_CARDS.map(i => (
                    <Skeleton key={i} className="h-40" />
                ))}
            </div>
        </div>
    );
}
