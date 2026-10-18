import { randomUUID } from 'crypto';

export const UserFactory = {
    create(overrides?: Partial<UserData>): UserData {
        const shortId = randomUUID().substring(0, 8);

        return {
            username: `testuser-${shortId}`,
            email: `testuser-${shortId}@test.com`,
            password: 'Password123',
            ...overrides,
        };
    },
};

interface UserData {
    username: string;
    email: string;
    password: string;
}

export const OrganizationFactory = {
    create(): OrganizationData {
        const shortId = randomUUID().substring(0, 8);

        return {
            name: `Test Organization ${shortId}`,
            description: 'Test organization description',
        };
    },
};

interface OrganizationData {
    name: string;
    description: string;
}
