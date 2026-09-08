'use client';

import { useReducer } from 'react';
import {
    platformConfigSchema,
    adminAccountSchema,
    organizationSchema,
    setupCategorySchema,
    registrationPolicySchema,
    type PlatformConfig,
    type AdminAccount,
    type OrganizationConfig,
    type SetupCategory,
    type RegistrationPolicy,
} from '../schemas/setup-schema';
import { DEFAULT_CATEGORIES } from '../lib/default-categories';

export const SETUP_STEPS = [
    'platform',
    'admin',
    'organization',
    'categories',
    'registration',
    'summary',
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];

export interface SetupData {
    platform: PlatformConfig;
    admin: AdminAccount;
    organization: OrganizationConfig;
    categories: SetupCategory[];
    registration: RegistrationPolicy;
}

interface SetupState {
    currentStep: number;
    data: SetupData;
}

type SetupAction =
    | { type: 'GO_TO_STEP'; step: number }
    | { type: 'NEXT_STEP' }
    | { type: 'PREV_STEP' }
    | { type: 'UPDATE_PLATFORM'; data: Partial<PlatformConfig> }
    | { type: 'UPDATE_ADMIN'; data: Partial<AdminAccount> }
    | { type: 'UPDATE_ORGANIZATION'; data: Partial<OrganizationConfig> }
    | { type: 'UPDATE_CATEGORIES'; data: SetupCategory[] }
    | { type: 'UPDATE_REGISTRATION'; data: Partial<RegistrationPolicy> };

const initialState: SetupState = {
    currentStep: 0,
    data: {
        platform: { platformName: '', defaultLanguage: 'en' },
        admin: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            setupSecret: '',
        },
        organization: { name: '', logo: '' },
        categories: DEFAULT_CATEGORIES,
        registration: { policy: 'invitation-only' },
    },
};

function setupReducer(state: SetupState, action: SetupAction): SetupState {
    switch (action.type) {
        case 'GO_TO_STEP':
            return {
                ...state,
                currentStep: Math.max(0, Math.min(action.step, SETUP_STEPS.length - 1)),
            };
        case 'NEXT_STEP':
            return {
                ...state,
                currentStep: Math.min(state.currentStep + 1, SETUP_STEPS.length - 1),
            };
        case 'PREV_STEP':
            return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };
        case 'UPDATE_PLATFORM':
            return {
                ...state,
                data: {
                    ...state.data,
                    platform: { ...state.data.platform, ...action.data },
                },
            };
        case 'UPDATE_ADMIN':
            return {
                ...state,
                data: {
                    ...state.data,
                    admin: { ...state.data.admin, ...action.data },
                },
            };
        case 'UPDATE_ORGANIZATION':
            return {
                ...state,
                data: {
                    ...state.data,
                    organization: { ...state.data.organization, ...action.data },
                },
            };
        case 'UPDATE_CATEGORIES':
            return {
                ...state,
                data: {
                    ...state.data,
                    categories: action.data,
                },
            };
        case 'UPDATE_REGISTRATION':
            return {
                ...state,
                data: {
                    ...state.data,
                    registration: { ...state.data.registration, ...action.data },
                },
            };
    }
}

const stepValidators: Record<SetupStep, (data: SetupData) => boolean> = {
    platform: data => platformConfigSchema.safeParse(data.platform).success,
    admin: data => adminAccountSchema.safeParse(data.admin).success,
    organization: data => organizationSchema.safeParse(data.organization).success,
    categories: data => {
        const categories = data.categories;
        if (!Array.isArray(categories) || categories.length === 0) {
            return false;
        }
        return categories.every(category => setupCategorySchema.safeParse(category).success);
    },
    registration: data => registrationPolicySchema.safeParse(data.registration).success,
    summary: () => true,
};

function readSetupStep(index: number): SetupStep {
    const step = SETUP_STEPS[index];
    if (step === undefined) {
        throw new Error('Invalid setup step index');
    }
    return step;
}

export function useSetupWizard() {
    'use no memo'; // Avoids a compiler cache that dropped updateStepData in production.

    const [state, dispatch] = useReducer(setupReducer, initialState);

    const goToStep = (step: number) => dispatch({ type: 'GO_TO_STEP', step });
    const nextStep = () => dispatch({ type: 'NEXT_STEP' });
    const prevStep = () => dispatch({ type: 'PREV_STEP' });

    function updateStepData(step: 'platform', data: Partial<PlatformConfig>): void;
    function updateStepData(step: 'admin', data: Partial<AdminAccount>): void;
    function updateStepData(step: 'organization', data: Partial<OrganizationConfig>): void;
    function updateStepData(step: 'categories', data: SetupCategory[]): void;
    function updateStepData(step: 'registration', data: Partial<RegistrationPolicy>): void;
    function updateStepData(
        ...args:
            | [step: 'platform', data: Partial<PlatformConfig>]
            | [step: 'admin', data: Partial<AdminAccount>]
            | [step: 'organization', data: Partial<OrganizationConfig>]
            | [step: 'categories', data: SetupCategory[]]
            | [step: 'registration', data: Partial<RegistrationPolicy>]
    ) {
        const [step, data] = args;
        switch (step) {
            case 'platform':
                dispatch({ type: 'UPDATE_PLATFORM', data });
                return;
            case 'admin':
                dispatch({ type: 'UPDATE_ADMIN', data });
                return;
            case 'organization':
                dispatch({ type: 'UPDATE_ORGANIZATION', data });
                return;
            case 'categories':
                dispatch({ type: 'UPDATE_CATEGORIES', data });
                return;
            case 'registration':
                dispatch({ type: 'UPDATE_REGISTRATION', data });
        }
    }

    const isStepValid = (step: SetupStep) => stepValidators[step](state.data);

    const currentStepName = readSetupStep(state.currentStep);

    return {
        currentStep: state.currentStep,
        currentStepName,
        data: state.data,
        totalSteps: SETUP_STEPS.length,
        goToStep,
        nextStep,
        prevStep,
        updateStepData,
        isStepValid,
        isFirstStep: state.currentStep === 0,
        isLastStep: state.currentStep === SETUP_STEPS.length - 1,
    };
}
