'use client';

import { cn } from '@/lib/utils';
import { Trophy, Target, CheckCircle, Flame, TrendingUp, Clock, Users, Lock } from 'lucide-react';
import type { AchievementTier } from '@/features/achievements/types/achievement';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';

const TIER_COLORS: Record<AchievementTier, string> = {
    bronze: 'bg-amber-600 text-amber-50',
    silver: 'bg-gray-400 text-gray-50',
    gold: 'bg-yellow-500 text-yellow-50',
};

const TIER_BORDER_COLORS: Record<AchievementTier, string> = {
    bronze: 'border-amber-600',
    silver: 'border-gray-400',
    gold: 'border-yellow-500',
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Trophy,
    Target,
    CheckCircle,
    Flame,
    TrendingUp,
    Clock,
    Users,
};

interface AchievementBadgeProps {
    icon: string;
    tier: AchievementTier;
    name: string;
    earned: boolean;
    size: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
}

export function AchievementBadge({
    icon,
    tier,
    name,
    earned,
    size,
    showTooltip = true,
}: AchievementBadgeProps) {
    const t = useTranslations('Achievements.card');
    const IconComponent = ICON_MAP[icon] || Trophy;

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    const iconSizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
    };

    const badge = (
        <div
            className={cn(
                'relative rounded-full flex items-center justify-center border-2 transition-all',
                sizeClasses[size],
                earned
                    ? cn(TIER_COLORS[tier], TIER_BORDER_COLORS[tier])
                    : 'bg-muted text-muted-foreground border-muted-foreground/30 opacity-50'
            )}
        >
            {earned ? (
                <IconComponent className={iconSizeClasses[size]} />
            ) : (
                <Lock className={iconSizeClasses[size]} />
            )}
        </div>
    );

    if (!showTooltip) {
        return badge;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent>
                <p className="font-semibold">{name}</p>
                {!earned && <p className="text-xs text-muted-foreground mt-1">{t('locked')}</p>}
            </TooltipContent>
        </Tooltip>
    );
}
