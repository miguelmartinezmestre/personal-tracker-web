import { defineSchema } from 'convex/server';
import { tables } from './generatedSchema';

// generatedSchema.ts is rewritten by `pnpm better-auth:generate`; the app's own indexes live here.
const schema = defineSchema({
    ...tables,
    user: tables.user
        .searchIndex('search_user_name', { searchField: 'name' })
        .searchIndex('search_user_email', { searchField: 'email' }),
    session: tables.session.index('by_activeOrganizationId_and_userId', [
        'activeOrganizationId',
        'userId',
    ]),
    member: tables.member.index('by_organizationId_and_userId', ['organizationId', 'userId']),
    invitation: tables.invitation
        .index('by_email_status_expiresAt', ['email', 'status', 'expiresAt'])
        .index('by_organizationId_status_expiresAt', ['organizationId', 'status', 'expiresAt']),
});

export default schema;
