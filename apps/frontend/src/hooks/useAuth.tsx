import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

const useAuth = () => {
    const navigate = useNavigate();

    const fetchAuth = async () => {
        const response = await fetch('http://localhost:3000/users/auth', {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

        return response.json();
    };

    const query = useQuery({
        queryKey: ['auth'],
        queryFn: fetchAuth,
    });

    if (query.isSuccess) {
        navigate({ to: '/' });
    }
};

export default useAuth;
