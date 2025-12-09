import SessionsTable from "@/components/sessions/sessions-table";


export default function Objectives() {
    return (
        <>
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Sessions </h1>
        </div>
        <SessionsTable />
        </>
    )
}

