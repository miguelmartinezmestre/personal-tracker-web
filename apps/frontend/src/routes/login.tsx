import { createFileRoute } from '@tanstack/react-router'
import Footer from '../components/footer'
import Header from '../components/header'

export const Route = createFileRoute('/login')({
    component: RouteComponent,
})

function RouteComponent() {

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.target);

        console.log(formData.get('email'), formData.get('password'));
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            <div className="flex items-center justify-center h-screen" >

                <form className='flex flex-col justity-center' onSubmit={onSubmit}>
                    <label htmlFor="email">email:</label>
                    <input type="email" name="email" className='border' />
                    <label htmlFor="password">contraseña:</label>
                    <input type="password" name="password" className='border' />
                    <br />
                    <button type='submit' className='border bg-gray-200'>Iniciar sesión</button>
                </form >

            </div >

            <Footer />
        </div >
    )
}
