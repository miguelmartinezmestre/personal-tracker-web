export default async function Objective({ params }: { params: Promise<{ id: string }> }) {

    const { id } = await params;
    return (
        <div>
            <h1>Objective {id}</h1>
        </div>
    );
}