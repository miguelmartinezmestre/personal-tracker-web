import { createFileRoute } from '@tanstack/react-router';
import { Suspense, use } from 'react';
import { Skeleton } from '../components/ui/skeleton';

export const Route = createFileRoute('/suspense')({
    component: RouteComponent,
});

function RouteComponent() {
    const wait = new Promise(resolve => setTimeout(resolve, 1000));

    return (
        <Suspense fallback={<Skeleton className="w-200 h-10">Loading...</Skeleton>}>
            <Profile wait={wait} />
        </Suspense>
    );
}

function Profile({ wait }: { wait: Promise<unknown> }) {
    const result = use(wait);

    return <div>Profile</div>;
}
