import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasCampaignAccess } from "@/lib/campaign";
import { getInteresadosR10 } from "@/app/actions/leads-r10";
import DealsR10Client from "./DealsR10Client";

export default async function DealsR10Page() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const user = session.user as any;

    // Bloquear acceso si el usuario no tiene campaña R10
    if (!hasCampaignAccess(user.campania, user.role, 'R10')) {
        redirect('/');
    }

    const userName = user.name || user.email || '';
    const userRole = user.role || 'STANDAR';

    // Cargar datos iniciales (sin filtros de fecha al inicio)
    const initialData = await getInteresadosR10(userName, userRole);

    return (
        <DealsR10Client
            ejecutivo={userName}
            userRole={userRole}
            initialData={initialData}
        />
    );
}