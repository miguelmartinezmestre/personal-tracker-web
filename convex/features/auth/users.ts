export function isActiveAccount(
    user: {
        banned?: boolean | null;
        banExpires?: number | null;
        deletedAt?: number | null;
    } | null,
    now: number
): boolean {
    return (
        user !== null &&
        user.deletedAt == null &&
        !(user.banned === true && (user.banExpires == null || user.banExpires > now))
    );
}

export function normalizeRegistrationEmail(email: string) {
    return email.trim().toLowerCase();
}
