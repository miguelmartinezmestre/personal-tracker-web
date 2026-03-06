import { redirect } from 'next/navigation';
import { checkPlatformSetUp } from '@/features/setup/lib/setup-check';
import SetupWizard from '@/features/setup/components/setup-wizard';

export default async function SetupPage() {
    if (await checkPlatformSetUp()) {
        redirect('/' as never);
    }

    return <SetupWizard />;
}
