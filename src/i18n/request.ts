import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async ({ requestLocale }) => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value;
  const locale = cookieLocale ?? (await requestLocale) ?? 'en';

  return {
    locale,
    messages: (await import(`../../translations/${locale}.json`)).default
  };
});