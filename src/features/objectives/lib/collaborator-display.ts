export type CollaboratorRole = 'editor' | 'viewer';

export function isCollaboratorRole(value: string): value is CollaboratorRole {
    return value === 'editor' || value === 'viewer';
}

export function formatCollaboratorIdentity(
    user: { name?: string | null; email?: string | null } | null | undefined,
    fallback: string
): string {
    const name = user?.name?.trim();
    const email = user?.email?.trim();
    if (name && email && name !== email) {
        return `${name} (${email})`;
    }
    return name || email || fallback;
}
