import { useQuery } from '@tanstack/react-query';
import { getObjective } from '../http/objectives';

export const useObjectiveQuery = (userId: number, goalId: number) => {
    const { data, isLoading } = useQuery({
        queryKey: ['objetive', { userId: userId, goalId: goalId }],
        queryFn: () => getObjective(goalId),
    });

    return { data, isLoading };
};
