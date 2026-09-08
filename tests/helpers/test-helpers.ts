import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
export const DEFAULT_PASSWORD = 'Password123';
const DASHBOARD_HOME_RE = /\/dashboard\/home(\?|$)/;
function normalizeForEmail(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');
}
function normalizeForSlug(name: string): string {
    const normalized = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return normalized.substring(0, 20);
}
function createSafeSlug(name: string, suffix: string): string {
    const normalized = normalizeForSlug(name);
    const maxBaseLength = 30 - 1 - suffix.length;
    const base = normalized.substring(0, Math.max(1, maxBaseLength));
    return `${base}-${suffix}`;
}
export interface CreateTestUserOptions {
    password?: string;
    usePresentableName?: boolean;
    customUsername?: string;
    customEmail?: string;
    customOrganizationSlug?: string;
}
export interface TestUserData {
    username: string;
    email: string;
    password: string;
    organizationSlug: string;
}
export function generateTestUserData(options?: CreateTestUserOptions): TestUserData {
    const uuid = randomUUID();
    const shortId = uuid.substring(0, 8);
    let username: string;
    let email: string;
    let organizationSlug: string;
    if (options?.customUsername) {
        username = options.customUsername;
        email = options.customEmail ?? `${normalizeForEmail(options.customUsername)}@example.com`;
        organizationSlug =
            options.customOrganizationSlug ?? createSafeSlug(options.customUsername, shortId);
    } else if (options?.usePresentableName) {
        const presentableNames = ['Miguel García', 'Ana Martínez', 'Carlos López'];
        // Deterministic pick derived from the generated id (no Math.random) so screenshots
        // and fixtures stay stable across runs while different calls still vary.
        const presentableName =
            presentableNames[shortId.charCodeAt(0) % presentableNames.length] ?? 'Test User';
        username = presentableName;
        email = `${normalizeForEmail(presentableName)}.${shortId}@example.com`;
        organizationSlug = createSafeSlug(presentableName, shortId);
    } else {
        username = `testuser-${shortId}`;
        email = `testuser-${shortId}@test.com`;
        organizationSlug = `org-${shortId}`;
    }
    return {
        username,
        email,
        password: options?.password ?? DEFAULT_PASSWORD,
        organizationSlug,
    };
}
export async function hasOrganizationSelectedInUI(page: Page): Promise<boolean> {
    const switcher = page.getByTestId('organization-switcher');
    if ((await switcher.count()) === 0) {
        return false;
    }
    const label = (
        (await switcher
            .first()
            .textContent({ timeout: 2000 })
            .catch(() => null)) ?? ''
    )
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (!label.trim()) {
        return false;
    }
    return !label.includes('no organization') && !label.includes('sin organizacion');
}
export async function selectOrganizationByName(
    page: Page,
    organizationName: string
): Promise<boolean> {
    const switcher = page.getByTestId('organization-switcher');
    if ((await switcher.count()) === 0) {
        return false;
    }
    await switcher.first().click();
    const option = page
        .locator(
            '[data-testid^="organization-option-"]:not([data-disabled]):not([aria-disabled="true"])'
        )
        .filter({ hasText: organizationName })
        .first();
    try {
        await expect(option).toBeVisible({ timeout: 5000 });
    } catch {
        await page.keyboard.press('Escape').catch(() => undefined);
        return false;
    }
    await option.click();
    await expect(option)
        .toBeHidden({ timeout: 5000 })
        .catch(() => undefined);
    return true;
}
async function waitForAuthenticatedDashboard(page: Page, timeout = 15000): Promise<void> {
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(DASHBOARD_HOME_RE, { timeout });
    await expect(page.getByRole('main')).toBeVisible({ timeout });
}
async function ensureActiveOrganization(page: Page, timeout = 12000): Promise<void> {
    await expect.poll(() => hasOrganizationSelectedInUI(page), { timeout }).toBe(true);
}
export async function ensureAuthenticatedState(page: Page): Promise<void> {
    await waitForAuthenticatedDashboard(page);
    await ensureActiveOrganization(page);
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
}
async function loginWithCredentials(page: Page, email: string, password: string): Promise<void> {
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(password);
    await page.getByTestId('login-button').click();
    await page.waitForURL(DASHBOARD_HOME_RE, { timeout: 30000 });
    await ensureAuthenticatedState(page);
}
async function fillControlledInput(
    page: Page,
    testId: string,
    value: string,
    options?: {
        secret?: boolean;
    }
): Promise<void> {
    const input = page.getByTestId(testId);
    await input.click();
    await input.fill('');
    await input.fill(value);
    const committed = await input.inputValue();
    if (committed === value) {
        return;
    }
    // WebKit occasionally drops the first fill on controlled inputs.
    await input.click();
    await input.fill('');
    await input.pressSequentially(value, { delay: 15 });
    await expect(input).toHaveValue(value, { timeout: 5000 });
    if (!options?.secret) {
        return;
    }
}
async function completeRegistrationFlow(page: Page, userData: TestUserData): Promise<void> {
    await page.goto('/register');
    await page.waitForSelector('[data-testid="register-username-input"]', {
        timeout: 10000,
    });
    await fillControlledInput(page, 'register-username-input', userData.username);
    await fillControlledInput(page, 'register-email-input', userData.email);
    await fillControlledInput(page, 'register-password-input', userData.password, { secret: true });
    await fillControlledInput(page, 'register-confirm-password-input', userData.password, {
        secret: true,
    });
    const organizationSlugInput = page.getByTestId('register-organization-slug-input');
    if ((await organizationSlugInput.count()) > 0) {
        await fillControlledInput(
            page,
            'register-organization-slug-input',
            userData.organizationSlug
        );
    }
    // Ensure controlled form state commits on WebKit before submit.
    await page.getByTestId('register-confirm-password-input').blur();
    const registerButton = page.getByTestId('register-button');
    await expect(registerButton).toBeEnabled({ timeout: 10000 });
    const signUpResponse = page.waitForResponse(
        response =>
            response.url().includes('/api/auth/sign-up/email') &&
            response.request().method() === 'POST',
        { timeout: 30000 }
    );
    await registerButton.click();
    expect((await signUpResponse).ok()).toBe(true);
    await page.waitForURL(/\/(dashboard\/home|login)(\?|$)/, { timeout: 30000 });
    if (/\/login(\?|$)/.test(page.url())) {
        await loginWithCredentials(page, userData.email, userData.password);
        return;
    }
    await page.waitForURL(DASHBOARD_HOME_RE, { timeout: 15000 });
    await ensureAuthenticatedState(page);
}
export async function createTestUser(
    page: Page,
    options?: CreateTestUserOptions
): Promise<TestUserData> {
    const userData = generateTestUserData(options);
    await completeRegistrationFlow(page, userData);
    return userData;
}
export async function loginUser(
    page: Page,
    email: string,
    password: string = DEFAULT_PASSWORD
): Promise<void> {
    await page.goto('/login');
    await loginWithCredentials(page, email, password);
    if (!DASHBOARD_HOME_RE.test(page.url())) {
        await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    }
    await expect(page).toHaveURL(DASHBOARD_HOME_RE);
}
export async function logoutUser(page: Page): Promise<void> {
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    if (/\/login(\?|$)/.test(page.url())) {
        return;
    }
    const logoutButton = page.getByTestId('logout-button');
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
    await logoutButton.click();
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 15000 });
}
export interface CreateObjectiveOptions {
    title?: string;
    description?: string;
    category?: string;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    visibility?: 'private' | 'organization';
    ensureCategories?: boolean;
}
export interface ObjectiveData {
    title: string;
    description: string;
    category: string;
    targetValue: number;
    currentValue: number;
    unit: string;
}
const createObjectiveButtonName = /^(Create Objective|Crear objetivo)$/i;
const createProgressButtonName = /^(Create New Update Progress|Crear nuevo progreso)$/i;
export async function openCreateObjectiveModal(page: Page): Promise<void> {
    const createButton = page.getByRole('button', { name: createObjectiveButtonName });
    await expect(createButton).toHaveCount(1, { timeout: 15000 });
    await createButton.click();
    await expect(page.getByTestId('objective-title-input')).toBeVisible({ timeout: 10000 });
}
export async function openCreateProgressModal(page: Page): Promise<void> {
    const createButton = page.getByRole('button', { name: createProgressButtonName });
    await expect(createButton).toHaveCount(1, { timeout: 15000 });
    await createButton.click();
    await expect(page.getByTestId('progress-value-input')).toBeVisible({ timeout: 10000 });
}
export async function createObjective(
    page: Page,
    options?: CreateObjectiveOptions
): Promise<ObjectiveData> {
    const uuid = randomUUID();
    const title = options?.title ?? `test-objective-${uuid.substring(0, 8)}`;
    const description = options?.description ?? 'Test objective description';
    const category = options?.category ?? `Obj Cat ${uuid.substring(0, 8)}`;
    const targetValue = options?.targetValue ?? 100;
    const currentValue = options?.currentValue ?? 0;
    const unit = options?.unit ?? 'units';
    if (options?.ensureCategories !== false) {
        await ensureDefaultCategories(page);
    }
    if (options?.ensureCategories === false || options?.category === undefined) {
        await createCategory(page, { name: category });
    }
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
    await openCreateObjectiveModal(page);
    await page.getByTestId('objective-title-input').fill(title);
    await page.getByTestId('objective-description-input').fill(description);
    await page.getByTestId('objective-category-select').click();
    const enabledOptions = page.locator(
        '[role="option"]:not([data-disabled]):not([aria-disabled="true"])'
    );
    const categoryOption = enabledOptions.filter({ hasText: new RegExp(category, 'i') }).first();
    await expect(categoryOption).toBeVisible({ timeout: 10000 });
    await categoryOption.click();
    await page.getByTestId('objective-target-input').fill(`${targetValue}`);
    await page.getByTestId('objective-unit-input').fill(unit);
    if (options?.visibility) {
        await page.getByTestId('objective-visibility-select').click();
        await page
            .getByRole('option', { name: new RegExp(options.visibility, 'i') })
            .first()
            .click();
    }
    await page.getByTestId('objective-save-button').click();
    await expect
        .poll(async () => await page.getByText(title).count(), {
            timeout: 15000,
            intervals: [500, 1000, 2000],
        })
        .toBeGreaterThan(0);
    return { title, description, category, targetValue, currentValue, unit };
}
export interface CreateCategoryOptions {
    name?: string;
    color?: string;
}
export interface CategoryData {
    name: string;
    color: string;
}
const categoryColorValues: Record<string, string> = {
    Red: '#ef4444',
    Orange: '#f97316',
    Yellow: '#eab308',
    Green: '#22c55e',
    Teal: '#14b8a6',
    Blue: '#3b82f6',
    Purple: '#a855f7',
    Pink: '#ec4899',
    Gray: '#6b7280',
};
function categoryColorValue(color: string): string {
    return categoryColorValues[color] ?? color;
}
export async function createCategory(
    page: Page,
    options?: CreateCategoryOptions
): Promise<CategoryData> {
    const uuid = randomUUID();
    const name = options?.name ?? `test-category-${uuid.substring(0, 8)}`;
    const color = options?.color ?? 'Blue';
    const colorValue = categoryColorValue(color);
    await ensureAuthenticatedState(page);
    await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('category-create-open')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('category-create-open').click();
    await expect(page.getByTestId('category-name-input')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('category-name-input').fill(name);
    await page.getByTestId('category-color-select').click();
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    await page.getByTestId(`category-color-${colorValue}`).click();
    const saveButton = page.getByTestId('category-save-button');
    await expect(saveButton).toBeEnabled({ timeout: 10000 });
    await saveButton.click();
    await expect(page.getByTestId('category-name-input')).toBeHidden({ timeout: 10000 });
    await expect(page.getByTestId('table-row').filter({ hasText: name }).first()).toBeVisible({
        timeout: 15000,
    });
    return { name, color: colorValue };
}
const PERSONAL_ROW = /\bPersonal\b/i;
function personalCategoryTableRowCount(page: Page) {
    return page.getByTestId('table-row').filter({ hasText: PERSONAL_ROW }).count();
}
async function hasVisiblePersonalCategory(page: Page): Promise<boolean> {
    if ((await personalCategoryTableRowCount(page)) > 0) {
        return true;
    }
    return page
        .getByText(PERSONAL_ROW)
        .first()
        .isVisible()
        .catch(() => false);
}
export async function ensureDefaultCategories(page: Page): Promise<void> {
    await ensureAuthenticatedState(page);
    await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('category-create-open')).toBeVisible({ timeout: 15000 });
    let hasPersonalCategory = false;
    const maxWait = Date.now() + 8000;
    while (Date.now() < maxWait && !hasPersonalCategory) {
        hasPersonalCategory = await hasVisiblePersonalCategory(page);
        if (!hasPersonalCategory) {
            await page.waitForTimeout(300);
        }
    }
    if (hasPersonalCategory) {
        return;
    }
    await createCategory(page, { name: 'Personal', color: 'Blue' }).catch(() => undefined);
    await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
    const maxVerify = Date.now() + 15000;
    while (Date.now() < maxVerify) {
        hasPersonalCategory = await hasVisiblePersonalCategory(page);
        if (hasPersonalCategory) {
            return;
        }
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
    }
    await expect(page.getByText(PERSONAL_ROW).first()).toBeVisible({ timeout: 5000 });
}
export interface CreateOrganizationOptions {
    name?: string;
    description?: string;
}
export interface OrganizationData {
    name: string;
    description: string;
}
export async function createOrganization(
    page: Page,
    options?: CreateOrganizationOptions
): Promise<OrganizationData> {
    const uuid = randomUUID();
    const name = options?.name ?? `test-org-${uuid.substring(0, 8)}`;
    const description = options?.description ?? 'Test organization description';
    await page.goto('/dashboard/organizations');
    await page.waitForURL(/\/dashboard\/organizations(\?|$)/, { timeout: 15000 });
    await page.waitForSelector('[data-testid="organizations-title"]', { timeout: 15000 });
    await page.getByTestId('organization-create-open').click();
    await page.waitForSelector('[data-testid="organization-name-input"]', { timeout: 5000 });
    await page.getByTestId('organization-name-input').fill(name);
    await page.getByTestId('organization-description-input').fill(description);
    await page.getByTestId('organization-save-button').click();
    // The modal closes only after the Better Auth request succeeds. A table-row
    // assertion then verifies that the reactive Convex result reached the UI.
    await expect(page.getByTestId('organization-name-input')).toBeHidden({ timeout: 20000 });
    await expect(page.getByTestId('table-row').filter({ hasText: name }).first()).toBeVisible({
        timeout: 20000,
    });
    return { name, description };
}
export async function waitForToast(page: Page, message: string | RegExp): Promise<void> {
    const toast = page.locator('[data-sonner-toast]', { hasText: message });
    await expect(toast).toBeVisible({ timeout: 5000 });
}
export async function waitForConvexData(
    page: Page,
    testId: string,
    options?: {
        timeout?: number;
    }
): Promise<void> {
    const timeout = options?.timeout ?? 15000;
    await expect(page.getByTestId(testId)).toBeVisible({ timeout });
}
export async function openModal(
    page: Page,
    triggerTestId: string,
    contentTestId: string,
    options?: {
        timeout?: number;
    }
): Promise<void> {
    const timeout = options?.timeout ?? 10000;
    await page.getByTestId(triggerTestId).click();
    await expect(page.getByTestId(contentTestId)).toBeVisible({ timeout });
}
export async function selectDropdownOption(
    page: Page,
    triggerTestId: string,
    optionText: string | RegExp,
    options?: {
        timeout?: number;
        fallbackToFirst?: boolean;
    }
): Promise<void> {
    const timeout = options?.timeout ?? 10000;
    const fallbackToFirst = options?.fallbackToFirst ?? false;
    await page.getByTestId(triggerTestId).click();
    await expect(page.getByRole('option').first()).toBeVisible({ timeout });
    const option = page.getByRole('option').filter({ hasText: optionText }).first();
    if ((await option.count()) > 0) {
        await option.click();
        return;
    }
    if (fallbackToFirst) {
        await page.getByRole('option').first().click();
        return;
    }
    const optionDescription = typeof optionText === 'string' ? optionText : optionText.source;
    throw new Error(`Dropdown option not found: ${optionDescription}`);
}
export async function navigateAndWaitForContent(
    page: Page,
    path: string,
    contentTestId: string,
    options?: {
        timeout?: number;
    }
): Promise<void> {
    const timeout = options?.timeout ?? 15000;
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(contentTestId)).toBeVisible({ timeout });
}
export function getPageOrigin(page: Page): string {
    const url = page.url();
    try {
        return new URL(url).origin;
    } catch {
        return process.env.BASE_URL || 'http://localhost:3000';
    }
}
