import { getTranslations } from 'next-intl/server';

export type AwaitedTranslations<Namespace extends string> = Awaited<
    ReturnType<typeof getTranslations<Namespace>>
>;
