import { useQuery } from "@tanstack/react-query";
import { getUpdateProgress } from "../http/update-progress";

export const useUpdateProgressQuery = (userId: number, goalId: number) => {
    const { data, refetch, isLoading } = useQuery({
        queryKey: ['update-progress', { userId: userId, goalId: goalId }],
        queryFn: () => getUpdateProgress(goalId),
    });
    
    return { data, refetch, isLoading };
};