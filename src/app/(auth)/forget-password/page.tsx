import Header from "@/components/header";
import Footer from "@/components/footer";
import ForgetPasswordForm from "@/components/auth/forget-password";

export default function ManageInvitationPage() {
    return (


        <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex-grow flex items-center justify-center p-6">
                <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
                    <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                        Restablecer contraseña
                    </h1>
                    <ForgetPasswordForm />
                </div>
            </div>
            <Footer />
        </div>
    )
}