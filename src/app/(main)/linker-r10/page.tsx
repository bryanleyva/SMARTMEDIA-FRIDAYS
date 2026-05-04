import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasCampaignAccess } from "@/lib/campaign";

export default async function LinkerR10Page() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const userRole = (session.user as any).role;
    const userCampania = (session.user as any).campania;

    if (!hasCampaignAccess(userCampania, userRole, 'R10')) {
        redirect('/');
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            padding: '2rem',
            textAlign: 'center',
        }}>
            <div style={{
                width: '6px',
                height: '60px',
                background: '#10b981',
                borderRadius: '3px',
                boxShadow: '0 0 25px #10b981',
                marginBottom: '2rem',
            }} />

            <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-0.02em',
                marginBottom: '1rem',
                textTransform: 'uppercase',
            }}>
                Linker R10
            </h1>

            <p style={{
                color: '#9ca3af',
                fontSize: '1.1rem',
                maxWidth: '520px',
                lineHeight: 1.6,
                marginBottom: '2rem',
            }}>
                Este módulo está en construcción. Pronto podrás gestionar las asignaciones y sesiones de la campaña RUC 10 desde aquí.
            </p>

            <div style={{
                padding: '0.5rem 1.25rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '999px',
                color: '#10b981',
                fontSize: '0.85rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
            }}>
                Próximamente
            </div>
        </div>
    );
}