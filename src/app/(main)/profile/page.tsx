import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { doc, loadDoc } from "@/lib/google-sheets";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session) redirect('/login');

    const username = session.user.email;

    await loadDoc();
    const sheet = doc.sheetsByTitle['USUARIOS'];
    const rows = await sheet.getRows();
    const userRow = rows.find(row => row.get('USER') === username);

    if (!userRow) return <div>Error loading profile</div>;

    const userData = {
        dni: userRow.get('DNI'),
        name: userRow.get('NOMBRES COMPLETOS'),
        user: userRow.get('USER'),
        role: userRow.get('ROL'),
        phone: userRow.get('TELEFONO'),
        photo: userRow.get('FOTO') || '',
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 max-w-3xl mx-auto px-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                <div style={{ width: '4px', height: '24px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '0.1em', color: 'white' }}>
                    CONFIGURACIÓN DE PERFIL
                </h2>
            </div>

            <ProfileForm user={userData} />
        </div>
    );
}
