import { baseUrl } from '../../main';

export async function logout() {
    const response = await fetch(baseUrl + '/users/logout', {
        method: 'POST',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to logout');
    }

    return response.json();
}

export async function recoverPassword(email: string) {
    const response = await fetch(baseUrl + '/users/recover-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to recover password');
    }

    return response.json();
}

export async function finishRecoverPassword(resetPasswordKey: string, password: string) {
    const response = await fetch(baseUrl + '/users/finish-recover-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resetPasswordKey, password }),
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to recover password');
    }

    return response.json();
}

export async function deleteUser(id: number) {
    const response = await fetch(baseUrl + '/users/' + id, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to delete user');
    }

    return response.json();
}
