import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasCampaignAccess, canManageMesaControl } from "@/lib/campaign";
import { getIngresadosR10 } from "@/app/actions/leads-r10";
import MesaControlR10Client from "./MesaControlR10Client";

export default async function MesaControlR10Page() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const user = session.user as any;
    if (!canManageMesaControl(user.role, user.campania, 'R10')) {
        redirect('/');
    }

    const userName = user.name || user.email || '';
    const userRole = user.role || 'BACKOFFICE';

    // Por defecto: ve todas las ventas del scope (ADMIN y BACKOFFICE ven todas)
    const initialData = await getIngresadosR10(userName, userRole, { scope: 'all' });

    return (
        <MesaControlR10Client
            user={userName}
            userRole={userRole}
            initialData={initialData}
        />
    );
}