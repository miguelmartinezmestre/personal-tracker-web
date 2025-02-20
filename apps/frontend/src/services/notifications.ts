import { Notification } from '../models/notification';
import { baseUrl } from '../main';

export async function getNotifications(): Promise<Notification[]> {
    const response = await fetch(baseUrl + '/notifications', {
        method: 'GET',
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
