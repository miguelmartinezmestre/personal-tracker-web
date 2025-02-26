import { createFileRoute, useParams } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/objetives/$id')({
    component: RouteComponent,
});

function RouteComponent() {
    const { id } = useParams({ strict: false });

    // console.log(id);

    return <div>Hello "/objetives/$id"!{id}</div>;
}
