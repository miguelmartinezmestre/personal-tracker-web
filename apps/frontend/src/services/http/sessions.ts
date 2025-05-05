import { Session } from '../../models/session';
import { baseUrl } from '../../main';

export async function getSessions(userId: number): Promise<Session[]> {
    const response = await fetch(baseUrl + `/sessions/user/${userId}`, {
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

export async function invalidateSession(sessionId: number) {
    const response = await fetch(baseUrl + `/sessions/invalidate/${sessionId}`, {
        method: 'PATCH',
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