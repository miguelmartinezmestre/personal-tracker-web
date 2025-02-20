import { Objetive } from '../models/objetive';
import { baseUrl } from '../main';

export async function createObjective(objective: Objetive): Promise<Objetive> {
    const response = await fetch(baseUrl + '/goals', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(objective),
    });

    const body = await response.json();

    if (!response.ok) {
        // console.log(body)
        throw new Error(body.message);
    }

    return body;
}

export async function getObjectives(userId: number): Promise<Objetive[]> {
    const response = await fetch(baseUrl + '/goals/user/' + userId, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const body = await response.json();

    if (!response.ok) {
        // console.log(body)
        throw new Error(body.message);
    }

    return body;
}
