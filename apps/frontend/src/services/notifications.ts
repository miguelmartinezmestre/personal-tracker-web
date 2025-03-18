import { Notification } from '../models/notification';
import { baseUrl } from '../main';

export async function getNotifications(userId: number): Promise<Notification[]> {
    const response = await fetch(baseUrl + '/notifications/user/' + userId, {
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
