import 'server-only';
import prisma from '@/lib/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function getUser() {
    const cookiesStore = await cookies();
    const sessionId = cookiesStore.get('session_id');

    if (!sessionId) {
        redirect('/login');
    }

    const session = await prisma.session.findFirst({
        where: {
            value: sessionId.value,
            status: 'active',
        },
        include: {
            user: true,
        },
    });

    if (!session) {
        redirect('/login');
    }

    return {
        name: session.user.username,
        email: session.user.email,
        id: session.user.id,
        role: session.user.role,
    };
}

export default getUser;
