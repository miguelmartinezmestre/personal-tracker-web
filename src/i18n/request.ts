import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
 
export default getRequestConfig(async () => {

  const cookieStore = await cookies();

  const locale = cookieStore.get('locale')?.value ?? 'en';

  console.log("locale", locale);
 
  return {
    locale,
    messages: (await import(`../../translations/${locale}.json`)).default
  };
});