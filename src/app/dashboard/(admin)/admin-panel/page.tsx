'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsersTable from '@/components/admin/users-table';
import UserSessions from '@/components/admin/user-sessions';
import CreateTeamFormModal from '@/components/teams/team-form-create-modal';
import TeamsTable from '@/components/teams/team-table';
import { Users, Activity, Building2, FileText } from 'lucide-react';
import AuditLogs from '@/components/admin/audit-logs';

export default function AdminPanel() {

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Panel de Administración</h1>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList>
                    <TabsTrigger value="users">
                        <Users className="h-4 w-4 mr-2" />
                        Usuarios
                    </TabsTrigger>
                    <TabsTrigger value="sessions">
                        <Activity className="h-4 w-4 mr-2" />
                        Sesiones
                    </TabsTrigger>
                    <TabsTrigger value="teams">
                        <Building2 className="h-4 w-4 mr-2" />
                        Equipos
                    </TabsTrigger>
                    <TabsTrigger value="audit">
                        <FileText className="h-4 w-4 mr-2" />
                        Auditoría
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-semibold">Gestión de Usuarios</h2>
                    </div>
                    <UsersTable />
                </TabsContent>

                <TabsContent value="sessions" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-semibold">Gestión de Sesiones</h2>
                    </div>
                    <UserSessions />
                </TabsContent>

                <TabsContent value="teams" className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold">Gestión de Equipos</h2>
                        <CreateTeamFormModal />
                    </div>
                    <TeamsTable />
                </TabsContent>

                <TabsContent value="audit" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-semibold">Logs de Auditoría</h2>
                    </div>
                    <AuditLogs />
                </TabsContent>
            </Tabs>
        </div>
    );
}
