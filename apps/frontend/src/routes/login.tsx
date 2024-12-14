import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Footer from '../components/footer';
import Header from '../components/header';
import { useMutation } from '@tanstack/react-query';
import { loginUser } from '../services/login';

export const Route = createFileRoute('/login')({
    component: RouteComponent,
});

function RouteComponent() {
    const navigate = useNavigate();
    const mutation = useMutation({
        mutationFn: (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            const formData = new FormData(e.target);

            const email = String(formData.get('email'));
            const password = String(formData.get('password'));

            if (!email || !password) {
                throw new Error('Some required fields are empty');
            }

            return loginUser({
                email,
                password,
            });
        },
        onSuccess: data => {
            console.log(data);
            if (data.status === 'success') {
                navigate({ to: '/dashboard' });
            }
        },
        onError: e => {
            console.log(e.message);
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
                    <label htmlFor="password">contraseña:</label>
                    <input type="password" name="password" className="border" />
                    <br />
                    <button type="submit" className="border bg-gray-200">
                        Iniciar sesión
                    </button>
                </form>
            </div>

            <Footer />
        </div>
    );
}
