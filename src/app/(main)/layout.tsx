import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import SessionGuardian from "@/components/SessionGuardian";
import InterstitialAd from "@/components/InterstitialAd";
import WhatsAppSupport from "@/components/WhatsAppSupport";

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen relative z-10 flex flex-col w-full bg-[#050505]">
            <SessionGuardian />
            <Navbar
                userRole={(session.user as any).role}
                userName={session.user.name}
                userCargo={(session.user as any).cargo}
                userPhoto={session.user.image ?? undefined}
                userCampania={(session.user as any).campania}
            />
            <main className="flex-1 w-full flex flex-col items-center" style={{ paddingTop: '94px' }}>
                <div className="container-custom w-full py-8">
                    {children}
                </div>
            </main>
            <WhatsAppSupport />
        </div>
    );
}