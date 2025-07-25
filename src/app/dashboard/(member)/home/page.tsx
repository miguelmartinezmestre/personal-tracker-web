"use client";
import ObjetivesTable from '@/components/objectives/objetives-table';
import Stats from '@/components/stats';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../../../../convex/_generated/api';

export default function Dashboard() {

    const { data: user } = useQuery(convexQuery(api.users.getUser, {}));

    return (
        <div>
            <h1 className="text-2xl font-bold" data-testid="welcome-message">Welcome {user?.name}</h1>
            {/* <Stats /> */}
            {/* <div>
                <ObjetivesTable />
            </div> */}
        </div>
    );
}
