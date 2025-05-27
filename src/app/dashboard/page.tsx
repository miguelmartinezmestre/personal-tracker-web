import { redirect } from "next/navigation";

export default async function Dashboard() {

    redirect('/dashboard/home');

    return (
        <div>
            <h1>Dashboard</h1>
        </div>
    )
}