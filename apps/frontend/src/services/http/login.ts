import { baseUrl } from '../../main';

export type LoginUser = { email: string; password: string };

export async function loginUser(user: LoginUser) {
    const response = await fetch(baseUrl + '/users/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message);
    }

    return response.status === 200;
}
