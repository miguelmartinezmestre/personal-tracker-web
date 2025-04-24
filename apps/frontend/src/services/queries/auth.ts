import { useQuery } from "@tanstack/react-query";
import { fetchAuth } from "../http/auth";

export const useAuthQuery = () => {
    const { data, isError, isLoading } = useQuery<{
        email: string;
        name: string;
        id: number;
}>({
    queryKey: ['auth'],
    queryFn: fetchAuth,
});

    return { data, isError, isLoading };
};
