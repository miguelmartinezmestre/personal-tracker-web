import { createFileRoute, Link } from '@tanstack/react-router';
import { MenuIcon, SettingsIcon, X } from 'lucide-react';
import { useState } from 'react';
import useAuth from '../hooks/useAuth';

export const Route = createFileRoute('/dashboard')({
    component: RouteComponent,
});

function RouteComponent() {

    useAuth();

    return (
        <div>
            <section className="layout">
                <div className="leftSide border">
                    <Link href="/objetives" className="leftSide item">
                        Mis objetivos
                    </Link>
                    <Link href="/dashboard" className="leftSide item">
                        Notificaciones
                    </Link>
                    <Link href="/dashboard" className="leftSide item">
                        Configuracion
                    </Link>
                </div>
                <div className="body border">Bienvenido a Metricas</div>
            </section>
        </div>
    );
}
