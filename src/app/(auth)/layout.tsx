import Footer from '@/features/landing/components/footer';
import Header from '@/features/landing/components/header';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex-grow flex items-center justify-center p-6">{children}</div>
            <Footer />
        </div>
    );
}
