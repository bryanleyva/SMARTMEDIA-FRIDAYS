import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasCampaignAccess } from "@/lib/campaign";
import { getIngresadosR10, getInteresadosR10 } from "@/app/actions/leads-r10";
import SupervisorR10Client from "./SupervisorR10Client";

export default async function SupervisorR10Page() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const user = session.user as any;
    const role = user.role;

    // Solo SPECIAL (supervisor) y ADMIN con campaña R10
    if (role !== 'SPECIAL' && role !== 'ADMIN') {
        redirect('/');
    }
    if (!hasCampaignAccess(user.campania, role, 'R10')) {
        redirect('/');
    }

    const userName = user.name || user.email || '';

    // Traer data del equipo (para SPECIAL) o todo (para ADMIN)
    const [ingresados, interesados] = await Promise.all([
        getIngresadosR10(userName, role, { scope: role === 'ADMIN' ? 'all' : 'team' }),
        getInteresadosR10(userName, role),
    ]);

    return (
        <SupervisorR10Client
            user={userName}
            userRole={role}
            ingresados={ingresados}
            interesados={interesados}
        />
    );
}