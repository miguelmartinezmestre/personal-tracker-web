import { Graph1 } from '@/components/graph1';
import { Graph2 } from '@/components/graph2';
import { Graph3 } from '@/components/graph3';
import ObjetivesTable from '@/components/objectives/objetives-table';

function t(key: string) {
    return key;
}

export default function Dashboard() {
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Graph1 />
                <Graph2 />
                <Graph3 />
            </div>
            <ObjetivesTable />
        </div>
    );
}
