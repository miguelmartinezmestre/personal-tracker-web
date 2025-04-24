import { UpdateProgress } from '../../models/update-progress';
import { baseUrl } from '../../main';

export async function createUpdateProgress(
    updateProgress: UpdateProgress
): Promise<UpdateProgress> {
    const response = await fetch(baseUrl + '/progress-updates', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateProgress),
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message);
    }

    return body;
}

export async function getUpdateProgress(goalId: number): Promise<UpdateProgress[]> {
    const response = await fetch(baseUrl + '/progress-updates/' + goalId, {
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

export async function updateUpdateProgress(
    updateProgress: UpdateProgress
): Promise<UpdateProgress> {
    const response = await fetch(baseUrl + '/progress-updates/' + updateProgress.id, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateProgress),
    });

    const body = await response.json();

    return body;
}
