import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../public/locales/en/translation.json';
import es from '../public/locales/es/translation.json';

i18n.use(initReactI18next).init({
    fallbackLng: 'es',
    debug: true,
    interpolation: {
        escapeValue: false,
    },
    resources: {
        en: {
            translation: en,
        },
        es: {
            translation: es,
        },
    },
    lng: localStorage.getItem('i18nextLng') || 'es',
});

export default i18n;
