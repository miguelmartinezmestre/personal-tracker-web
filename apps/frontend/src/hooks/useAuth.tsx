import { useNavigate } from '@tanstack/react-router';
import { useAuthQuery } from '../services/queries/auth';



export default function useAuth(): { email: string; name: string; id: number; isLoading: boolean } {
    const navigate = useNavigate();

    const { data, isError, isLoading } = useAuthQuery();

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
