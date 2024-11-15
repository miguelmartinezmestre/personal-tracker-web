import { ReactNode } from "react";


export default function Section({ id, title, children }: { id: string, title: string, children: ReactNode }) {
    return (
        <section id={id} className="py-10 px-4 container mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
            <div className="text-gray-700">{children}</div>
        </section>
    );
};