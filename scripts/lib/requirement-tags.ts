export function unknownRequirementTags(source: string, known: ReadonlySet<string>): string[] {
    return [
        ...new Set(
            [...source.matchAll(/@(REQ-[A-Z0-9-]+)/g)].flatMap(match => {
                const id = match[1];
                return id && !known.has(id) ? [id] : [];
            })
        ),
    ];
}
