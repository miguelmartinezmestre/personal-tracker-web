import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Footer from '../components/footer';
import Header from '../components/header';
import { useMutation } from '@tanstack/react-query';
import { registerUser } from '../services/register';

export const Route = createFileRoute('/register')({
    component: RouteComponent,
});

function RouteComponent() {
    const navigate = useNavigate();
    const mutation = useMutation({
        mutationFn: (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            const formData = new FormData(e.target);

            const username = String(formData.get('username'));
            const email = String(formData.get('email'));
            const password = String(formData.get('password'));

            if (!username || !email || !password) {
                throw new Error('Some required fields are empty');
            }

            return registerUser({
                username,
                email,
                password,
            });
        },
        onSuccess: () => {
            console.log('aaaaaaaa');
            navigate({ to: '/dashboard' });
        },
        onError: (e) => {
            console.log(e.message)
            // console.log(e)
        },
    });

    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            <div className="flex items-center justify-center h-screen">
                <form className="flex flex-col justity-center" onSubmit={mutation.mutate}>
                    <label htmlFor="email">email:</label>
                    <input type="email" name="email" className="border" />
                    <label htmlFor="username">username:</label>
                    <input type="text" name="username" className="border" />
                    <label htmlFor="password">contraseña:</label>
                    <input type="password" name="password" className="border" />
                    <br />
                    <button type="submit" className="border bg-gray-200">
                        Registrarse
                    </button>
                </form>
            </div>

            <Footer />
        </div>
    );
}
