import { Objetive } from '../models/objetive';
import { baseUrl } from '../main';

export async function createObjective(objective: Objetive): Promise<Objetive> {
    const response = await fetch(baseUrl + '/goals', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(objective),
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message);
    }

    return body;
}

export async function getObjectives(userId: number): Promise<Objetive[]> {
    const response = await fetch(baseUrl + '/goals/user/' + userId, {
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

export async function updateObjective(objective: Objetive): Promise<Objetive> {
    const response = await fetch(baseUrl + '/goals/' + objective.id, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(objective),
    });

    const body = await response.json();

    return body;
}

export async function getObjective(id: number): Promise<Objetive> {
    const response = await fetch(baseUrl + '/goals/' + id, {
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
