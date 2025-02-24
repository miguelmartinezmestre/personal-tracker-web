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

export default function useAuth(): { email: string; name: string; id: number } {
    const navigate = useNavigate();

    const { data, isError, isLoading } = useQuery<{
        email: string;
        name: string;
        id: number;
    }>({
        queryKey: ['auth'],
        queryFn: fetchAuth,
        retry: false,
    });

    // console.log('isError', isError);

    if (isError) {
        navigate({ to: '/' });
    }

    console.log('data', data);

    if (!isLoading && !data) {
        throw new Error('Authentication failed');
    }

    //@ts-ignore
    return data;
}
