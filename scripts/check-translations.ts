import { assertUniqueTranslationKeys } from './lib/translation-validation';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryIconSchema } from '../src/features/categories/schemas/category';
import { routing } from '../src/i18n/routing';
import {
    isJsonObject,
    parseJsonValue,
    type JsonObject,
    type JsonValue,
} from '../convex/utils/json';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFile);
const translationsDirectory = join(currentDirectory, '..', 'src', 'translations');
const configuredLocales = [...routing.locales].sort();
const configuredLocaleSet = new Set<string>(configuredLocales);

function getAllKeys(value: JsonValue, prefix = ''): string[] {
    if (!isJsonObject(value)) {
        return prefix ? [prefix] : [];
    }

    const keys: string[] = [];
    for (const [key, childValue] of Object.entries(value)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(...getAllKeys(childValue, fullKey));
    }

    return keys;
}

function loadTranslations(locale: string): JsonObject {
    const filePath = join(translationsDirectory, `${locale}.json`);
    if (!existsSync(filePath)) {
        throw new Error(`Missing translation file for configured locale "${locale}": ${filePath}`);
    }

    const source = readFileSync(filePath, 'utf8');
    assertUniqueTranslationKeys(source, filePath);
    const parsed = parseJsonValue(source);
    if (!isJsonObject(parsed)) {
        throw new Error(`Invalid translation file for configured locale "${locale}": ${filePath}`);
    }

    return parsed;
}

function getTranslationFileLocales(): string[] {
    return readdirSync(translationsDirectory)
        .filter(fileName => fileName.endsWith('.json'))
        .map(fileName => fileName.replace(/\.json$/, ''))
        .sort();
}

console.log('Checking translations...\n');
console.log(`Configured locales: ${configuredLocales.join(', ')}`);
console.log(`Default locale: ${routing.defaultLocale}\n`);

const fileLocales = getTranslationFileLocales();
const orphanFiles = fileLocales.filter(locale => !configuredLocaleSet.has(locale));
const missingFiles = configuredLocales.filter(locale => !fileLocales.includes(locale));

const localeKeys = new Map<string, string[]>();
for (const locale of configuredLocales) {
    localeKeys.set(locale, getAllKeys(loadTranslations(locale)).sort());
}

const requiredKeys = categoryIconSchema.options.map(icon => `Common.icons.${icon}`);
const allKeys = [...new Set([...localeKeys.values()].flat().concat(requiredKeys))].sort();
let hasErrors = false;

if (orphanFiles.length > 0) {
    hasErrors = true;
    console.log('=== Translation files without configured locales ===');
    orphanFiles.forEach(locale => console.log(`  - ${locale}.json`));
    console.log('');
}

if (missingFiles.length > 0) {
    hasErrors = true;
    console.log('=== Configured locales without translation files ===');
    missingFiles.forEach(locale => console.log(`  - ${locale}`));
    console.log('');
}

for (const locale of configuredLocales) {
    const keys = localeKeys.get(locale) ?? [];
    const keySet = new Set(keys);
    const missingKeys = allKeys.filter(key => !keySet.has(key));

    console.log(`=== Missing keys in ${locale.toUpperCase()} ===`);
    if (missingKeys.length === 0) {
        console.log('OK - All keys are present');
    } else {
        hasErrors = true;
        console.log(`MISSING - ${missingKeys.length} keys:\n`);
        missingKeys.forEach(key => console.log(`  - ${key}`));
    }
    console.log('');
}

console.log('=== Summary ===');
for (const locale of configuredLocales) {
    console.log(`Total keys in ${locale.toUpperCase()}: ${localeKeys.get(locale)?.length ?? 0}`);
}

if (hasErrors) {
    console.log('\nMISSING - Translations are NOT synchronized');
    process.exit(1);
}

console.log('\nOK - Translations are complete and synchronized');
