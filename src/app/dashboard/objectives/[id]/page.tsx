import { UpdateProgressLayout } from '@/features/update-progress';
import { redirect } from 'next/navigation';

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id || typeof id !== 'string') {
        redirect('/dashboard/objectives');
    }

    return <UpdateProgressLayout />;
}
