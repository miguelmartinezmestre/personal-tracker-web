import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "../http/notifications";

export const useNotificationsQuery = (userId: number) => {
    const { data, isLoading } = useQuery({
        queryKey: ['notifications', { userId: userId }],
        queryFn: () => getNotifications(userId),
    });
    
    return { data, isLoading };
};