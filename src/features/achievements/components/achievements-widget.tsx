'use client';

import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ChevronRight, Star, Award } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { api } from '@/convex/_generated/api';
import { AchievementBadge } from './achievement-badge';
import type { AchievementTier } from '@/features/achievements/schemas/achievement';
import { Preloaded } from 'convex/react';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';

// Hoist static array outside component to avoid recreation on every render
const SKELETON_COUNTS = [1, 2, 3, 4];

export function AchievementsWidget({
  preloadedUserAchievementStatsQuery,
  preloadedUserRecentAchievementsQuery,
}: {
  preloadedUserAchievementStatsQuery: Preloaded<typeof api.achievements.getUserAchievementStats>;
  preloadedUserRecentAchievementsQuery: Preloaded<typeof api.achievements.getRecentAchievements>;
}) {
  const stats = usePreloadedAuthQuery(preloadedUserAchievementStatsQuery);
  const recentAchievements = usePreloadedAuthQuery(preloadedUserRecentAchievementsQuery);

  const t = useTranslations('Achievements');

  const isLoading = !stats || !recentAchievements;

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 animate-pulse" />
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <div className="flex gap-2">
              {SKELETON_COUNTS.map(i => (
                <Skeleton key={i} className="w-12 h-12 rounded-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="achievements-widget"
      className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="relative">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <div className="absolute inset-0 blur-xl bg-yellow-500/20 group-hover:bg-yellow-500/30 transition-all" />
          </div>
          {t('widget.title')}
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hover:bg-primary/10 hover:text-primary transition-all"
          >
            <Link href="/dashboard/achievements">
              {t('widget.viewAll')}
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="group/stat flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 hover:from-yellow-500/20 hover:to-yellow-500/10 transition-all duration-300">
              <div className="relative">
                <Star className="h-8 w-8 text-yellow-500 group-hover/stat:scale-110 transition-transform" />
                <div className="absolute inset-0 blur-lg bg-yellow-500/20" />
              </div>
              <div>
                <p className="text-2xl font-bold group-hover/stat:scale-105 transition-transform origin-left">
                  {stats?.totalPoints ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">{t('stats.totalPoints')}</p>
              </div>
            </div>
            <div className="group/stat flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all duration-300">
              <div className="relative">
                <Award className="h-8 w-8 text-primary group-hover/stat:scale-110 transition-transform" />
                <div className="absolute inset-0 blur-lg bg-primary/20" />
              </div>
              <div>
                <p className="text-2xl font-bold group-hover/stat:scale-105 transition-transform origin-left">
                  {stats?.earnedCount ?? 0}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{stats?.totalAvailable ?? 0}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">{t('stats.earned')}</p>
              </div>
            </div>
          </div>

          {/* Recent Achievements */}
          {recentAchievements != null && recentAchievements.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                {t('widget.recentlyEarned')}
              </p>
              <div className="flex flex-wrap gap-2">
                {recentAchievements
                  .filter((a): a is NonNullable<typeof a> => a !== null)
                  .map((achievement, index) => (
                    <div
                      key={achievement._id}
                      className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <AchievementBadge
                        icon={achievement.icon ?? 'Trophy'}
                        tier={(achievement.tier as AchievementTier) ?? 'bronze'}
                        name={t(`definitions.${achievement.code}.name`, {
                          defaultValue: achievement.code ?? 'Achievement',
                        })}
                        earned={true}
                        size="md"
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Trophy className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t('widget.noAchievements')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
