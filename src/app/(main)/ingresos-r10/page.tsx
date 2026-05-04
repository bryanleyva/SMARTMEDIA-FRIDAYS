import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasCampaignAccess } from "@/lib/campaign";
import { getIngresadosR10 } from "@/app/actions/leads-r10";
import IngresosR10Client from "./IngresosR10Client";

export default async function IngresosR10Page() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const user = session.user as any;
    if (!hasCampaignAccess(user.campania, user.role, 'R10')) {
        redirect('/');
    }

    const userName = user.name || user.email || '';
    const userRole = user.role || 'STANDAR';
    const initialData = await getIngresadosR10(userName, userRole);

    return (
        <IngresosR10Client
            ejecutivo={userName}
            userRole={userRole}
            initialData={initialData}
        />
    );
}