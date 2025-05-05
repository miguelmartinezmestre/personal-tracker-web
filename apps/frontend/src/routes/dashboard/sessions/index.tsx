import { createFileRoute } from '@tanstack/react-router';
import Sessions from '../../../components/sessions';

export const Route = createFileRoute('/dashboard/sessions/')({
    component: Sessions,
});
