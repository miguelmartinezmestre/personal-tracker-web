import { createFileRoute } from '@tanstack/react-router';
import Objectives from '../../../components/objectives';

export const Route = createFileRoute('/dashboard/objectives/')({
    component: Objectives,
});
