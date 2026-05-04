import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SessionLinker from '@/components/SessionLinker';

export default async function LinkerPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) redirect('/login');

    const user = session.user as any;
    const role = user.role || 'STANDAR';
    const userName = user.name || user.email || '';

    return (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-300">
            <SessionLinker
                currentUserRole={role}
                currentUserName={userName}
                currentUserCargo={user.cargo || ''}
            />
        </div>
    );
}
