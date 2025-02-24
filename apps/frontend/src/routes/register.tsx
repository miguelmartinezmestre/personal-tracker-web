import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Footer from '../components/footer';
import Header from '../components/header';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { registerUser } from '../services/register';

export const Route = createFileRoute('/register')({
    component: RouteComponent,
});

const formSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    // .min(8, {
    //     message: "Password must be at least 8 characters.",
    // }),
    username: z.string(),
});

function RouteComponent() {
    const navigate = useNavigate();
    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof formSchema>) => {
            const email = values.email;
            const password = values.password;
            const username = values.username;

            if (!email || !password || !username) {
                throw new Error('Some required fields are empty');
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
            setLoginError(error.message);
        },
    });

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: 'a@a.com',
            password: 'a@a@134545',
            username: 'user',
        },
    });

    // 2. Define a submit handler.
    function onSubmit(values: z.infer<typeof formSchema>) {
        // Do something with the form values.
        // ✅ This will be type-safe and validated.
        console.log(JSON.stringify(values, null, 2));
        mutation.mutate(values);
    }

    const [loginError, setLoginError] = useState<string | null>(null);

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex items-center justify-center h-screen">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {loginError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{loginError}</AlertDescription>
                            </Alert>
                        )}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormDescription>This is your email.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormDescription>This is your password.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Iniciar sesión</Button>
                    </form>
                </Form>
            </div>
            <Footer />
        </div>
    );
}
