export type User = { username: string; email: string; password: string };

export async function registerUser(user: User) {
    const response = await fetch('http://localhost:3000/users/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
    });

    const body = await response.json();

    if (!response.ok) {
        console.log(body)
        throw new Error(body.message);
    }

    return body;
}
