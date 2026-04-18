import { Page, Locator } from '@playwright/test';

export const AuthSelectors = {
    usernameInput: (page: Page): Locator =>
        page.getByRole('textbox', { name: /username|nombre de usuario/i }),

    emailInput: (page: Page): Locator => page.getByRole('textbox', { name: /email|correo/i }),

    passwordInput: (page: Page): Locator => page.getByRole('textbox', { name: /^password$/i }),

    confirmPasswordInput: (page: Page): Locator =>
        page.getByRole('textbox', { name: /confirm password|confirmar/i }),

    loginButton: (page: Page): Locator =>
        page.getByRole('button', { name: /login|sign in|iniciar sesion/i }),

    registerButton: (page: Page): Locator =>
        page.getByRole('button', { name: /register|sign up|registrarse/i }),

    forgotPasswordLink: (page: Page): Locator =>
        page.getByRole('link', { name: /forgot password|olvide/i }),
};

export const NavigationSelectors = {
    adminLink: (page: Page): Locator =>
        page.getByRole('navigation').getByRole('link', { name: /admin/i }),

    dashboardLink: (page: Page): Locator =>
        page.getByRole('navigation').getByRole('link', { name: /dashboard|home|inicio/i }),

    objectivesLink: (page: Page): Locator =>
        page.getByRole('navigation').getByRole('link', { name: /objectives|objetivos/i }),

    categoriesLink: (page: Page): Locator =>
        page.getByRole('navigation').getByRole('link', { name: /categories|categorias/i }),

    organizationsLink: (page: Page): Locator =>
        page.getByRole('navigation').getByRole('link', { name: /organizations|organizaciones/i }),

    settingsLink: (page: Page): Locator =>
        page.getByRole('navigation').getByRole('link', { name: /settings|configuracion/i }),

    logoutButton: (page: Page): Locator =>
        page.getByRole('button', { name: /logout|sign out|cerrar sesion/i }),
};

export const TableSelectors = {
    table: (page: Page): Locator => page.getByRole('table'),

    tableRow: (page: Page, text?: string): Locator =>
        text
            ? page.getByRole('row').filter({ hasText: text }).first()
            : page.getByRole('row').first(),

    tableCell: (page: Page, text: string): Locator => page.getByRole('cell', { name: text }),

    tableHeader: (page: Page, name: string | RegExp): Locator =>
        page.getByRole('columnheader', { name }),
};

export const DialogSelectors = {
    dialog: (page: Page): Locator => page.getByRole('dialog'),

    alertDialog: (page: Page): Locator => page.getByRole('alertdialog'),

    confirmButton: (page: Page): Locator =>
        page.getByRole('button', { name: /confirm|yes|si|accept/i }),

    cancelButton: (page: Page): Locator =>
        page.getByRole('button', { name: /cancel|no|close|cerrar/i }),

    closeButton: (page: Page): Locator => page.getByRole('button', { name: /close|x|cerrar/i }),
};

export const MessageSelectors = {
    errorAlert: (page: Page): Locator =>
        page.getByRole('alert').filter({ hasText: /error|invalid|failed/i }),

    successAlert: (page: Page): Locator =>
        page.getByRole('status').filter({ hasText: /success|exito|completado/i }),

    accessDeniedHeading: (page: Page): Locator =>
        page.getByRole('heading', { name: /access denied|forbidden|no autorizado|sin acceso/i }),
};

export const FormSelectors = {
    submitButton: (page: Page, name?: string | RegExp): Locator =>
        name
            ? page.getByRole('button', { name })
            : page.getByRole('button', { name: /submit|save|guardar|enviar/i }),

    textInput: (page: Page, label: string | RegExp): Locator =>
        page.getByRole('textbox', { name: label }),

    select: (page: Page, label: string | RegExp): Locator =>
        page.getByRole('combobox', { name: label }),

    checkbox: (page: Page, label: string | RegExp): Locator =>
        page.getByRole('checkbox', { name: label }),

    radio: (page: Page, label: string | RegExp): Locator =>
        page.getByRole('radio', { name: label }),
};
