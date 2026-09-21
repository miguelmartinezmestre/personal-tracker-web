import type { ReactFormExtendedApi } from '@tanstack/react-form';

/* oxlint-disable typescript/no-explicit-any -- TanStack Form validator slots are invariant; there is no public AnyFormApi */
export type TanStackFormApi<TFormData extends object = Record<string, unknown>> =
    ReactFormExtendedApi<TFormData, any, any, any, any, any, any, any, any, any, any, any>;
/* oxlint-enable typescript/no-explicit-any */
