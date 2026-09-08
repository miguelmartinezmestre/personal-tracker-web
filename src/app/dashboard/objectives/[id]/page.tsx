import { UpdateProgressLayout } from '@/features/update-progress';
import { redirect } from 'next/navigation';

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        redirect('/dashboard/objectives');
    }

    return <UpdateProgressLayout />;
}
