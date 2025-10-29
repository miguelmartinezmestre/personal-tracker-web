import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  let detectedLocale: string | undefined;
  try {
    detectedLocale = await requestLocale;
  } catch {
    detectedLocale = undefined;
  }

  const locale = detectedLocale ?? 'en';

  return {
    locale,
    messages: (await import(`../../translations/${locale}.json`)).default
  };
});