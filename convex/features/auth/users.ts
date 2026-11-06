export function isActiveAccount(
    user: { banned?: boolean | null; banExpires?: number | null; deletedAt?: number } | null,
    now: number
): boolean {
    return (
        user !== null &&
        user.deletedAt === undefined &&
        !(user.banned === true && (user.banExpires == null || user.banExpires > now))
    );
}

export function normalizeRegistrationEmail(email: string) {
    return email.trim().toLowerCase();
}
