import type { LucideIcon } from 'lucide-react';
import {
    Tag,
    Heart,
    Briefcase,
    Book,
    User,
    DollarSign,
    Users,
    Palette,
    Home,
    Map,
    Target,
    BarChart3 as Chart,
    Check,
    Calendar,
    Lightbulb,
    TrendingUp,
    Star,
    Award,
    Zap,
    Coffee,
    Music,
    Camera,
    Plane,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
    tag: Tag,
    heart: Heart,
    briefcase: Briefcase,
    book: Book,
    user: User,
    'dollar-sign': DollarSign,
    users: Users,
    palette: Palette,
    home: Home,
    map: Map,
    target: Target,
    chart: Chart,
    check: Check,
    calendar: Calendar,
    lightbulb: Lightbulb,
    'trending-up': TrendingUp,
    star: Star,
    award: Award,
    zap: Zap,
    coffee: Coffee,
    music: Music,
    camera: Camera,
    plane: Plane,
};

export function getLucideIcon(iconName: string | undefined | null): LucideIcon | null {
    if (!iconName) {
        return null;
    }

    const icon = iconMap[iconName];
    if (icon) {
        return icon;
    }

    return null;
}
