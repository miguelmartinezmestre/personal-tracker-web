import { randomUUID } from 'crypto';

/**
 * Factory for generating test user data.
 */
export const UserFactory = {
    /**
     * Generates unique user data.
     */
    create(overrides?: Partial<UserData>): UserData {
        const shortId = randomUUID().substring(0, 8);
        return {
            username: `testuser-${shortId}`,
            email: `testuser-${shortId}@test.com`,
            password: 'Password123',
            organizationSlug: `org-${shortId}`,
            ...overrides,
        };
    },

    /**
     * Generates user data with a presentable name.
     */
    createPresentable(overrides?: Partial<UserData>): UserData {
        const shortId = randomUUID().substring(0, 8);
        const names = ['Miguel Garcia', 'Ana Martinez', 'Carlos Lopez', 'Laura Sanchez'];
        const name = names[Math.floor(Math.random() * names.length)];
        const normalizedName = name.toLowerCase().replace(/\s+/g, '.');

        return {
            username: name,
            email: `${normalizedName}.${shortId}@example.com`,
            password: 'Password123',
            organizationSlug: `org-${shortId}`,
            ...overrides,
        };
    },
};

export interface UserData {
    username: string;
    email: string;
    password: string;
    organizationSlug: string;
}

/**
 * Factory for generating test objective data.
 */
export const ObjectiveFactory = {
    /**
     * Generates unique objective data.
     */
    create(overrides?: Partial<ObjectiveData>): ObjectiveData {
        const shortId = randomUUID().substring(0, 8);
        return {
            title: `Test Objective ${shortId}`,
            description: 'Test objective description',
            category: 'Personal',
            targetValue: 100,
            currentValue: 0,
            unit: 'units',
            ...overrides,
        };
    },

    /**
     * Generates objective data for a fitness goal.
     */
    createFitness(overrides?: Partial<ObjectiveData>): ObjectiveData {
        return {
            title: 'Run a Marathon',
            description: 'Train to complete a full marathon',
            category: 'Health',
            targetValue: 42,
            currentValue: 0,
            unit: 'km',
            ...overrides,
        };
    },

    /**
     * Generates objective data for a learning goal.
     */
    createLearning(overrides?: Partial<ObjectiveData>): ObjectiveData {
        return {
            title: 'Learn TypeScript',
            description: 'Complete TypeScript course and build projects',
            category: 'Personal',
            targetValue: 100,
            currentValue: 0,
            unit: 'lessons',
            ...overrides,
        };
    },

    /**
     * Generates objective data for a financial goal.
     */
    createFinancial(overrides?: Partial<ObjectiveData>): ObjectiveData {
        return {
            title: 'Save for Vacation',
            description: 'Save money for summer vacation',
            category: 'Personal',
            targetValue: 2000,
            currentValue: 0,
            unit: 'EUR',
            ...overrides,
        };
    },
};

export interface ObjectiveData {
    title: string;
    description: string;
    category: string;
    targetValue: number;
    currentValue: number;
    unit: string;
}

/**
 * Factory for generating test category data.
 */
export const CategoryFactory = {
    /**
     * Generates unique category data.
     */
    create(overrides?: Partial<CategoryData>): CategoryData {
        const shortId = randomUUID().substring(0, 8);
        return {
            name: `Category ${shortId}`,
            color: 'Blue',
            ...overrides,
        };
    },

    /**
     * Predefined category templates.
     */
    personal(): CategoryData {
        return { name: 'Personal', color: 'Green' };
    },

    work(): CategoryData {
        return { name: 'Work', color: 'Blue' };
    },

    health(): CategoryData {
        return { name: 'Health', color: 'Red' };
    },

    finance(): CategoryData {
        return { name: 'Finance', color: 'Yellow' };
    },
};

export interface CategoryData {
    name: string;
    color: string;
}

/**
 * Factory for generating test organization data.
 */
export const OrganizationFactory = {
    /**
     * Generates unique organization data.
     */
    create(overrides?: Partial<OrganizationData>): OrganizationData {
        const shortId = randomUUID().substring(0, 8);
        return {
            name: `Test Organization ${shortId}`,
            description: 'Test organization description',
            ...overrides,
        };
    },

    /**
     * Generates organization data for a team.
     */
    createTeam(overrides?: Partial<OrganizationData>): OrganizationData {
        const shortId = randomUUID().substring(0, 8);
        return {
            name: `Team ${shortId}`,
            description: 'A team working together to achieve goals',
            ...overrides,
        };
    },
};

export interface OrganizationData {
    name: string;
    description: string;
}

/**
 * Factory for generating test notification data.
 */
export const NotificationFactory = {
    /**
     * Generates unique notification data.
     */
    create(overrides?: Partial<NotificationData>): NotificationData {
        const shortId = randomUUID().substring(0, 8);
        return {
            message: `Test notification ${shortId}`,
            type: 'reminder',
            ...overrides,
        };
    },
};

export interface NotificationData {
    message: string;
    type: string;
}

/**
 * Factory for generating test progress update data.
 */
export const ProgressUpdateFactory = {
    /**
     * Generates progress update data.
     */
    create(overrides?: Partial<ProgressUpdateData>): ProgressUpdateData {
        return {
            value: 10,
            note: 'Made progress on this objective',
            ...overrides,
        };
    },
};

export interface ProgressUpdateData {
    value: number;
    note?: string;
}
