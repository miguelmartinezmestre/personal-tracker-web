"use client";
import { useConvexQuery } from '@convex-dev/react-query';
import { api } from '../../../../../convex/_generated/api';


export default function Dashboard() {

    const user = useConvexQuery(api.auth.getCurrentUser);

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
