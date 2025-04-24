import { Session } from '../../models/session';
import { baseUrl } from '../../main';

export async function getSessions(): Promise<Session[]> {
    const response = await fetch(baseUrl + '/sessions', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message);
    }

    return body;
}
