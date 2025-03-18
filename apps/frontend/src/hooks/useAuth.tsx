import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { baseUrl } from '../main';

async function fetchAuth(): Promise<{
    email: string;
    name: string;
    id: number;
}> {
    const response = await fetch(baseUrl + '/users/auth', {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Authentication failed');
    }

    return response.json();
}

export default function useAuth(): { email: string; name: string; id: number; isLoading: boolean } {
    const navigate = useNavigate();

    const { data, isError, isLoading } = useQuery<{
        email: string;
        name: string;
        id: number;
    }>({
        queryKey: ['auth'],
        queryFn: fetchAuth,
    });

    if (isError) {
        navigate({ to: '/' });
    }

    //@ts-ignore
    return {
        email: data ? data.email : '',
        name: data ? data.name : '',
        id: data ? data.id : 0,
        isLoading,
    };
}
