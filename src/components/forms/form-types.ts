import type { ReactFormExtendedApi } from '@tanstack/react-form';

/** Native TanStack Form API used by reusable field groups. */
// The React API is invariant in its form value and validator generics. A shared
// field-group prop must accept every concrete form returned by `useForm`.
/* oxlint-disable typescript/no-explicit-any */
export type TanStackFormApi = ReactFormExtendedApi<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
>;
/* oxlint-enable typescript/no-explicit-any */
