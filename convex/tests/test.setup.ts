export const modules = import.meta.glob(['../**/*.*s', '!../tests/**', '!../betterAuth/**']);

export const betterAuthModules = {
    ...import.meta.glob('../betterAuth/**/*.*s'),
    '../betterAuth/testing.ts': () => import('./authTesting'),
};
