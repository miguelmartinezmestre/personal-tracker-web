'use client';

import { useTranslations } from 'next-intl';
import { Trophy, Users, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AchievementCard } from './achievement-card';
import { achievementEmptyMessage } from '../lib/parse-achievement-progress';
import type { AchievementProgress } from '@/features/achievements/schemas/achievement';

type AchievementsTabsProps = {
    filter: 'all' | 'earned' | 'locked';
    individualAchievements: AchievementProgress[];
    organizationAchievements: AchievementProgress[];
};

export function AchievementsTabs({
    filter,
    individualAchievements,
    organizationAchievements,
}: AchievementsTabsProps) {
    const t = useTranslations('Achievements');
    const emptyMessage = achievementEmptyMessage(filter, {
        noEarned: t('empty.noEarned'),
        noLocked: t('empty.noLocked'),
        noAchievements: t('empty.noAchievements'),
    });

    return (
        <Tabs defaultValue="individual" className="w-full" data-testid="achievements-tabs">
            <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger
                    value="individual"
                    className="flex items-center gap-2"
                    data-testid="achievements-tab-individual"
                >
                    <User className="h-4 w-4" />
                    {t('types.individual')}
                </TabsTrigger>
                <TabsTrigger
                    value="organization"
                    className="flex items-center gap-2"
                    data-testid="achievements-tab-organization"
                >
                    <Users className="h-4 w-4" />
                    {t('types.organization')}
                </TabsTrigger>
            </TabsList>

            <TabsContent
                value="individual"
                className="mt-6"
                data-testid="achievements-content-individual"
            >
                {individualAchievements.length > 0 ? (
                    <div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        data-testid="achievements-grid-individual"
                    >
                        {individualAchievements.map(achievement => (
                            <AchievementCard
                                key={achievement.definition._id}
                                definition={achievement.definition}
                                currentProgress={achievement.currentProgress}
                                isEarned={achievement.isEarned}
                                earnedAt={achievement.earnedAt}
                            />
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">{emptyMessage}</p>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>

            <TabsContent
                value="organization"
                className="mt-6"
                data-testid="achievements-content-organization"
            >
                {organizationAchievements.length > 0 ? (
                    <div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        data-testid="achievements-grid-organization"
                    >
                        {organizationAchievements.map(achievement => (
                            <AchievementCard
                                key={achievement.definition._id}
                                definition={achievement.definition}
                                currentProgress={achievement.currentProgress}
                                isEarned={achievement.isEarned}
                                earnedAt={achievement.earnedAt}
                            />
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Users className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                {t('empty.noOrganizationAchievements')}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
    );
}
