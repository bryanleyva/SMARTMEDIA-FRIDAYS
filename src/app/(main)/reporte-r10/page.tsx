import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasCampaignAccess } from "@/lib/campaign";
import { getIngresadosR10, getInteresadosR10 } from "@/app/actions/leads-r10";
import ReporteR10Client from "./ReporteR10Client";

export default async function ReporteR10Page() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const user = session.user as any;
    const role = user.role;

    if (!hasCampaignAccess(user.campania, role, 'R10')) {
        redirect('/');
    }

    const userName = user.name || user.email || '';

    // Scope según rol
    let scope: 'mine' | 'team' | 'all' = 'mine';
    if (role === 'ADMIN' || role === 'BACKOFFICE') scope = 'all';
    else if (role === 'SPECIAL') scope = 'team';

    const [ingresados, interesados] = await Promise.all([
        getIngresadosR10(userName, role, { scope }),
        getInteresadosR10(userName, role),
    ]);

    return (
        <ReporteR10Client
            user={userName}
            userRole={role}
            ingresados={ingresados}
            interesados={interesados}
        />
    );
}