export type LoginUser = { email: string; password: string };

export async function loginUser(user: LoginUser) {
    const response = await fetch('http://localhost:3000/users/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
    });

    const body = await response.json();

    if (!response.ok) {
        console.log(body);
        throw new Error(body.message);
    }

    return body;
}
