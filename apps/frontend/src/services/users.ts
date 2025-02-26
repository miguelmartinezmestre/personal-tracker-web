export async function logout() {
    const response = await fetch('/users/logout', {
        method: 'POST',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to logout');
    }

    return response.json();
}
