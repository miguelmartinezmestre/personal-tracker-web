import { createFileRoute, useParams, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/objetives/$id')({
    component: RouteComponent,
});

function RouteComponent() {
    const { id } = useParams({ strict: false });

    return (
        <div>
            <Link to="/dashboard/objetives">Back</Link>
            <h1>Objetive {id}</h1>
        </div>
    );
}
