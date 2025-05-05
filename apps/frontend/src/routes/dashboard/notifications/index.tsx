import { createFileRoute } from '@tanstack/react-router';
import Notifications from '../../../components/notifications';
export const Route = createFileRoute('/dashboard/notifications/')({
    component: Notifications,
});