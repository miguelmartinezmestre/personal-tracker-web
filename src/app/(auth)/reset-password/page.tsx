import ResetPassword from "@/components/auth/reset-password";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function ResetPasswordPage({searchParams}: {searchParams: Promise<{ [key: string]: string | string[] | undefined }>}) {

    const params = await searchParams;

    console.log(params);

    const resetPasswordKey = params.key;

    console.log(resetPasswordKey);

    if (!resetPasswordKey) {
        redirect('/');
    }

    // const user = await prisma.user.findFirst({
    //     where: {
    //         resetPasswordKey: resetPasswordKey as string,
    //     },
    // });

    // if (!user) {
    //     redirect('/');
    // }

    const t = await getTranslations('HomePage');

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex-grow flex items-center justify-center p-6">
                <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
                    <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                        {t('resetPassword')}
                    </h1>
                    <ResetPassword />
                </div>
            </div>
            <Footer />
        </div>
    )
}