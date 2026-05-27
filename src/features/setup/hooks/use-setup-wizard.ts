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

export type DataStep = Exclude<SetupStep, 'summary'>;

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
    | { type: 'UPDATE_STEP_DATA'; step: DataStep; data: Partial<SetupData[DataStep]> };

const initialState: SetupState = {
    currentStep: 0,
    data: {
        platform: { platformName: '', defaultLanguage: 'en' },
        admin: { username: '', email: '', password: '', confirmPassword: '' },
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
        case 'UPDATE_STEP_DATA':
            return {
                ...state,
                data: {
                    ...state.data,
                    [action.step]:
                        action.step === 'categories'
                            ? action.data
                            : {
                                  ...state.data[action.step],
                                  ...(action.data as Record<string, unknown>),
                              },
                },
            };
        default:
            return state;
    }
}

const stepValidators: Record<SetupStep, (data: SetupData) => boolean> = {
    platform: data => platformConfigSchema.safeParse(data.platform).success,
    admin: data => adminAccountSchema.safeParse(data.admin).success,
    organization: data => organizationSchema.safeParse(data.organization).success,
    categories: data => {
        const categories = data.categories;
        if (!Array.isArray(categories) || categories.length === 0) return false;
        return categories.every(category => setupCategorySchema.safeParse(category).success);
    },
    registration: data => registrationPolicySchema.safeParse(data.registration).success,
    summary: () => true,
};

export function useSetupWizard() {
    const [state, dispatch] = useReducer(setupReducer, initialState);

    const goToStep = (step: number) => dispatch({ type: 'GO_TO_STEP', step });
    const nextStep = () => dispatch({ type: 'NEXT_STEP' });
    const prevStep = () => dispatch({ type: 'PREV_STEP' });

    const updateStepData = <S extends DataStep>(
        step: S,
        data: S extends 'categories' ? SetupCategory[] : Partial<SetupData[S]>
    ) =>
        dispatch({
            type: 'UPDATE_STEP_DATA',
            step,
            data: data as Partial<SetupData[DataStep]>,
        });

    const isStepValid = (step: SetupStep) => stepValidators[step](state.data);

    const currentStepName = SETUP_STEPS[state.currentStep]!;

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
