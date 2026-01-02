'use client';

import { Trophy } from 'lucide-react';
import { Badge } from '@repo/ui/components/badge';
import { useUnviewedAchievementsCount } from '@/hooks/api/use-achievements';

export function SidebarAchievementIndicator() {
    const { data: count } = useUnviewedAchievementsCount();

    return (
        <div className="relative inline-flex items-center">
            <Trophy className="h-4 w-4" />
            {count && count > 0 && (
                <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                >
                    {count > 9 ? '9+' : count}
                </Badge>
            )}
        </div>
    );
}
