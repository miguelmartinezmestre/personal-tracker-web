import { useQuery } from '@tanstack/react-query';
import { getObjectives } from '../http/objectives';

export const useObjectivesQuery = (userId: number) => {
    const { data, refetch, isLoading } = useQuery({
        queryKey: ['objectives', { userId: userId }],
        queryFn: () => getObjectives(userId),
    });

    return { data, refetch, isLoading };
};
