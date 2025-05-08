import { useMutation } from '@tanstack/react-query';
import { loginUser } from '../http/login';
import { formSchema } from '../../schemas/login';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { registerUser } from '../http/register';
import { formSchema as registerFormSchema } from '../../schemas/register';
import { logout, recoverPassword } from '../http/users';
import { formSchema as recoverPasswordFormSchema } from '../../schemas/recover-password';
export const useLoginMutation = () => {
    const navigate = useNavigate();
    const [loginError, setLoginError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof formSchema>) => {
            const { email, password } = values;

            if (!email || !password) {
                throw new Error('Todos los campos son obligatorios');
            }

            return loginUser({
                email,
                password,
            });
        },
        onSuccess: () => {
            navigate({ to: '/dashboard/home' });
        },
        onError: (error: Error) => {
            setLoginError(error.message);
        },
    });

    return { mutation, loginError };
};

export const useRegisterMutation = () => {
    const navigate = useNavigate();
    const [registerError, setRegisterError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof registerFormSchema>) => {
            const { email, password, username } = values;

            if (!email || !password || !username) {
                throw new Error('Todos los campos son obligatorios');
            }

            return registerUser({
                email,
                password,
                username,
            });
        },
        onSuccess: () => {
            navigate({ to: '/login' });
        },
        onError: (error: Error) => {
            setRegisterError(error.message);
        },
    });

    return { mutation, registerError };
};

export const useLogoutMutation = () => {
    const logoutMutation = useMutation({
        mutationFn: logout,
    });

    return { logoutMutation };
};

export const useRecoverPasswordMutation = () => {
    const navigate = useNavigate();
    const [loginError, setLoginError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof recoverPasswordFormSchema>) => {
            const { email } = values;

            if (!email) {
                throw new Error('Todos los campos son obligatorios');
            }

            return recoverPassword(email);
        },
        onSuccess: async () => {
            await navigate({ to: '/login' });
        },
        onError: (error: Error) => {
            setLoginError(error.message);
        },
    });

    return { mutation, loginError };
};