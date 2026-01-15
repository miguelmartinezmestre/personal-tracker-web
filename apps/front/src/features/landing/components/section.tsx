export default function Section({ title, content }: { title: string; content: string }) {
    return (
        <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{title}</h2>
            <p className="text-gray-600">{content}</p>
        </section>
    );
}
