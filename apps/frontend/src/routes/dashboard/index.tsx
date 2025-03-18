import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/')({
    component: IndexComponent,
});

function IndexComponent() {
    return (
        <div>
            <Outlet />
        </div>
    );
}
