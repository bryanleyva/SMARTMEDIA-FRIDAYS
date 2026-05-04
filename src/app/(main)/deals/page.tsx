import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPipelineData } from "@/app/actions/leads";
import ProspectPipelineBoard from "@/components/ProspectPipelineBoard";
import { UserCache } from "@/lib/user-cache";
import { hasCampaignAccess } from "@/lib/campaign";

export default async function ProspectosPage() {
    const session = await getServerSession(authOptions);

    if (!session) redirect('/login');

    const userName = session.user.name || session.user.email || '';
    const userRole = (session.user as any).role || 'STANDARD';
    const userCampania = (session.user as any).campania;

    // Bloquear acceso si no tiene campaña R20
    if (!hasCampaignAccess(userCampania, userRole, 'R20')) {
        redirect('/');
    }

    // Fetch initial data
    const myData = await getPipelineData(userName, { role: userRole });

    // Fetch team members if applies
    let teamMembers: { user: string, name: string }[] = [];
    if (userRole === 'ADMIN' || userRole === 'SPECIAL') {
        const userCache = UserCache.getInstance();
        await userCache.ensureInitialized();
        if (userRole === 'SPECIAL') {
            teamMembers = userCache.getTeamForSupervisor(userName).map(r => ({
                user: r.get('USER'),
                name: r.get('NOMBRES COMPLETOS')
            }));
        } else {
            teamMembers = userCache.getAll().map(r => ({
                user: r.get('USER'),
                name: r.get('NOMBRES COMPLETOS')
            }));
        }
    }

    return (
        <div className="animate-in fade-in slide-in-from-right-10 duration-300 h-[calc(100vh-64px)] flex flex-col w-full overflow-hidden select-none bg-[#050505]">
            <div className="px-8 py-5 flex items-center justify-between relative z-50" style={{ backgroundColor: 'rgba(24, 24, 27, 0.4)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div className="flex items-center gap-6">
                    <div className="w-1.5 h-10 bg-emerald-500 rounded-full shadow-[0_0_25px_#10b981]" />
                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic" style={{ letterSpacing: '-0.02em' }}>
                        Pipeline Deals
                    </h2>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase">Status: Live</span>
                        <span className="text-white/10 text-xs font-mono">v2.1.0-ULTRA</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full overflow-hidden">
                <ProspectPipelineBoard
                    leads={myData}
                    userRole={userRole}
                    userName={userName}
                    teamMembers={teamMembers}
                />
            </div>
        </div>
    );
}