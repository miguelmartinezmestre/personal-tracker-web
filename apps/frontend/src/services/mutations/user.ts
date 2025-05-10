import { useMutation } from '@tanstack/react-query';
import { loginUser } from '../http/login';
import { formSchema } from '../../schemas/login';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { registerUser } from '../http/register';
import { formSchema as registerFormSchema } from '../../schemas/register';
import { deleteUser, logout, recoverPassword } from '../http/users';
import { formSchema as recoverPasswordFormSchema } from '../../schemas/recover-password';
import { formSchema as deleteAccountSchema } from '../../schemas/delete-account';

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
        onSuccess: async () => {
            await navigate({ to: '/dashboard/home' });
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
        onSuccess: async () => {
            await navigate({ to: '/login' });
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

export const useDeleteUserMutation = () => {
    const navigate = useNavigate();
    const [loginError, setLoginError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof deleteAccountSchema>) => {
            const { id } = values;

            if (!id) {
                throw new Error('Todos los campos son obligatorios');
            }

            return deleteUser(id);
        },
        onSuccess: async () => {
            console.log('User deleted');
            await navigate({ to: '/' });
        },
        onError: (error: Error) => {
            setLoginError(error.message);
        },
    });

    return { mutation, loginError };
};
