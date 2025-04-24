import { baseUrl } from "../../main";

export async function fetchAuth(): Promise<{
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