import { useQuery } from "@tanstack/react-query";
import { getSessions } from "../http/sessions";

export const useSessionsQuery = (userId: number) => {
    const { data, isLoading } = useQuery({
        queryKey: ['sessions', { userId: userId }],
        queryFn: () => getSessions(userId),
    });
    
    return { data, isLoading };
};