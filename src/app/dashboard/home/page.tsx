// import { DashboardLayout } from "@/components/dashboard-layout"
// import { cookies } from "next/headers"
"use client"

import { browserQueryClient, useTRPC } from "@/trpc/client"
import { useMutation, useQuery } from "@tanstack/react-query"

export default function Dashboard() {

    const trpc = useTRPC()

    const createObjective = useMutation(trpc.objectives.createObjective.mutationOptions())

    const handleCreateObjective = () => {
        createObjective.mutate({
            title: "Test",
            description: "Test",
            targetValue: 100,
            currentValue: 0,
        })

        browserQueryClient.invalidateQueries(trpc.objectives.getObjectivesByUser.queryOptions({}))
    }

    const objectives = useQuery(trpc.objectives.getObjectivesByUser.queryOptions({}))

    return (
        <div>
            {/* <h1>Dashboard</h1> */}
            
            <button onClick={handleCreateObjective}>Create Objective</button>
            <div>
                {objectives.data?.map((objective) => (
                    <table key={objective.id}>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Target Value</th>
                                <th>Current Value</th>
                                <th>Deadline</th>
                            </tr>
                        </thead>
                        <tr>
                            <td>{objective.title}</td>
                            <td>{objective.description}</td>
                            <td>{objective.targetValue}</td>
                            <td>{objective.currentValue}</td>
                            <td>{objective.deadline}</td>
                        </tr>
                    </table>
                ))}
            </div>
        </div>
    )
}