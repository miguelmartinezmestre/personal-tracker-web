import { ObjectiveDetail } from '@/features/objectives';

export default async function ObjectivePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ObjectiveDetail objectiveId={id} />;
}
