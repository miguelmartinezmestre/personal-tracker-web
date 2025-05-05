import { createFileRoute } from '@tanstack/react-router';
import Objective from '../../../components/objective';

export const Route = createFileRoute('/dashboard/objectives/$id')({
    component: Objective,
});
