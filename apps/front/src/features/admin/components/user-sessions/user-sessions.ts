export type UserSession = {
    _id: string;
    _creationTime: number;
    expiresAt: number,
    token: string,
    createdAt: number,
    updatedAt: number,
    ipAddress?: string | null | undefined,
    userAgent?: string | null | undefined,
    userId: string,
    impersonatedBy?: string | null | undefined,
    activeOrganizationId?: string | null | undefined,
};