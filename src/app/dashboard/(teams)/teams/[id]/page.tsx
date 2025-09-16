import CreateTeamMemberFormModal from "@/components/team-members/team-members-form-create-modal";
import TeamMembersTable from "@/components/team-members/team-members-table";
import { getTranslations } from "next-intl/server";

export default async function Team({ params }: { params: Promise<{ id: string }> }) {

    const { id } = await params;
    const t = await getTranslations('TeamMembers');

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{t('title')} {id} </h1>
                <CreateTeamMemberFormModal />
            </div>
            <TeamMembersTable />
        </>
    );
}

