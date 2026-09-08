export function achievementEmptyMessage(
    filter: 'all' | 'earned' | 'locked',
    labels: { noEarned: string; noLocked: string; noAchievements: string }
): string {
    if (filter === 'earned') {
        return labels.noEarned;
    }
    if (filter === 'locked') {
        return labels.noLocked;
    }
    return labels.noAchievements;
}
