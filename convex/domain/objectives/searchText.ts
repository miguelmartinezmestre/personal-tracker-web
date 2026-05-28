type ObjectiveSearchTextInput = {
    title: string;
    description?: string;
    category?: string;
};

export function buildObjectiveSearchText({
    title,
    description,
    category,
}: ObjectiveSearchTextInput): string {
    return [title, description, category]
        .map(value => value?.trim())
        .filter((value): value is string => Boolean(value))
        .join('\n');
}
