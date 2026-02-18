/**
 * Script to verify that all translations are synchronized
 * between language files (es.json and en.json)
 *
 * Usage: node scripts/check-translations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to translation files
const translationsDir = path.join(__dirname, '..', 'translations');
const esPath = path.join(translationsDir, 'es.json');
const enPath = path.join(translationsDir, 'en.json');

// Recursive function to get all keys from an object
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Function to load and parse a JSON file
function loadTranslations(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Load translations
console.log('Checking translations...\n');
const es = loadTranslations(esPath);
const en = loadTranslations(enPath);

// Get all keys
const esKeys = getAllKeys(es).sort();
const enKeys = getAllKeys(en).sort();

// Find missing keys
const missingInEn = esKeys.filter(k => !enKeys.includes(k));
const missingInEs = enKeys.filter(k => !esKeys.includes(k));

// Show results
console.log('=== Missing keys in EN (English) ===');
if (missingInEn.length === 0) {
  console.log('✓ None - All keys are present');
} else {
  console.log(`✗ Missing ${missingInEn.length} keys:\n`);
  missingInEn.forEach(k => console.log(`  - ${k}`));
}

console.log('\n=== Missing keys in ES (Spanish) ===');
if (missingInEs.length === 0) {
  console.log('✓ None - All keys are present');
} else {
  console.log(`✗ Missing ${missingInEs.length} keys:\n`);
  missingInEs.forEach(k => console.log(`  - ${k}`));
}

console.log('\n=== Summary ===');
console.log(`Total keys in ES: ${esKeys.length}`);
console.log(`Total keys in EN: ${enKeys.length}`);
console.log(`Difference: ${Math.abs(esKeys.length - enKeys.length)}`);

// Final result
if (esKeys.length === enKeys.length && missingInEn.length === 0 && missingInEs.length === 0) {
  console.log('\n✓ Translations are complete and synchronized');
  process.exit(0);
} else {
  console.log('\n✗ Translations are NOT synchronized');
  process.exit(1);
}
