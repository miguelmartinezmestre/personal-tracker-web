import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [{
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
}, ...compat.extends(
  "next/core-web-vitals", 
  "next/typescript",
  "plugin:react/recommended",
  "plugin:jsx-a11y/recommended"
), ...compat.plugins("react", "jsx-a11y", "@next/next"), {
  // Configuración para React 17+ / Next.js
  settings: {
    react: {
      version: "detect"
    }
  },
  rules: {
    // Desactivar la regla que requiere importar React
    'react/react-in-jsx-scope': 'off',
    
    // Reglas existentes
    '@typescript-eslint/no-explicit-any': 'off',
    
    // Reglas para prevenir errores de hidratación
    'react/no-unescaped-entities': 'error',
    'react/void-dom-elements-no-children': 'error',
    'react/no-danger': 'warn',
    'react/no-unknown-property': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/jsx-pascal-case': 'error',
    
    // Reglas de accesibilidad que también ayudan con la estructura HTML
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/html-has-lang': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-role': 'error',
    
    // Reglas específicas de Next.js
    '@next/next/no-html-link-for-pages': 'error',
    '@next/next/no-sync-scripts': 'error',
    '@next/next/no-img-element': 'warn',
    '@next/next/no-unwanted-polyfillio': 'warn',
    '@next/next/no-page-custom-font': 'warn',
  },
}];

export default eslintConfig;