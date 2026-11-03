import { CheckCircle2, Clock, Flame, Target, TrendingUp, type LucideIcon } from 'lucide-react';

const CATEGORY_ICONS: Record<'milestone' | 'completion' | 'streak' | 'activity', LucideIcon> = {
    milestone: Target,
    completion: CheckCircle2,
    streak: Flame,
    activity: TrendingUp,
};

export function achievementIcon(achievement: {
    code: string;
    category: keyof typeof CATEGORY_ICONS;
}): LucideIcon {
    return achievement.code === 'early_bird' ? Clock : CATEGORY_ICONS[achievement.category];
}
