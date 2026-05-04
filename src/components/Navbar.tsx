'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import UserMenu from './UserMenu';

interface NavbarProps {
    userRole?: string;
    userName?: string | null;
    userCargo?: string;
    userPhoto?: string;
    userCampania?: string;
}

interface NavItem {
    name: string;
    path: string;
    campaign?: 'R20' | 'R10' | 'ALL';
    roles?: string[];
}

/**
 * Parsea la columna CAMPANIA del usuario.
 * Acepta: "R20", "R10", "R20,R10", "R20 R10", etc.
 * Si el valor está vacío o no existe, se asume R20 por defecto
 * para no romper a usuarios ya existentes que no tienen campania asignada.
 */
function parseCampaigns(campania?: string, role?: string): string[] {
    if (!campania || campania.trim() === '') {
        // ADMIN y roles especiales sin campania asignada ven todo
        if (role === 'ADMIN') return ['R20', 'R10'];
        // El resto sin campania: asumir R20 por defecto
        return ['R20'];
    }
    return campania
        .toUpperCase()
        .split(/[\s,;|]+/)
        .map(s => s.trim())
        .filter(s => s === 'R20' || s === 'R10');
}

export default function Navbar({ userRole, userName, userCargo, userPhoto, userCampania }: NavbarProps) {
    const pathname = usePathname();

    const isHR = userCargo?.trim().toUpperCase() === 'RECURSOS HUMANOS';
    const campaigns = parseCampaigns(userCampania, userRole);
    const hasR20 = campaigns.includes('R20');
    const hasR10 = campaigns.includes('R10');

    // Post Venta: rol ANDREA, o ADMIN, o cargo que contenga POSTVENTA
    const isPostVenta =
        userRole === 'ADMIN' ||
        userRole === 'ANDREA' ||
        userCargo?.trim().toUpperCase().includes('POSTVENTA');

    const allNavItems: NavItem[] = [
        { name: 'Inicio',            path: '/',                campaign: 'ALL' },
        // --- R20 ---
        { name: 'Leads',             path: '/leads',           campaign: 'R20', roles: ['STANDAR', 'SPECIAL', 'ADMIN'] },
        { name: 'Deals',             path: '/deals',           campaign: 'R20', roles: ['STANDAR', 'SPECIAL', 'ADMIN'] },
        { name: 'Post Venta',        path: '/postventa',       campaign: 'R20' }, // filtrado por isPostVenta abajo
        { name: 'Linker',            path: '/linker',          campaign: 'R20', roles: ['STANDAR', 'SPECIAL', 'ADMIN', 'BACKOFFICE'] },
        // --- R10 ---
        { name: 'Deals R10',         path: '/deals-r10',       campaign: 'R10', roles: ['STANDAR', 'ADMIN'] },
        { name: 'Ingresos ',         path: '/ingresos-r10',    campaign: 'R10', roles: ['STANDAR', 'SPECIAL', 'ADMIN'] },
        { name: 'Mesa Control R10',  path: '/mesa-control-r10',campaign: 'R10', roles: ['BACKOFFICE', 'ADMIN'] },
        { name: 'Supervisor R10',    path: '/supervisor-r10',  campaign: 'R10', roles: ['SPECIAL', 'ADMIN'] },
        { name: 'Reporte R10',       path: '/reporte-r10',     campaign: 'R10' },
        // --- Compartido ---
        { name: 'Reporte',           path: '/reporte',         campaign: 'ALL' },
    ];

    const navItems = allNavItems.filter(item => {
        // RRHH solo ve Inicio y Reporte
        if (isHR) {
            return item.name === 'Inicio' || item.name === 'Reporte';
        }

        // Post Venta: lógica propia, no pasa por el filtro de roles genérico
        if (item.name === 'Post Venta') {
            return isPostVenta;
        }

        // Filtrado por rol
        if (item.roles && item.roles.length > 0) {
            if (!userRole || !item.roles.includes(userRole)) return false;
        }

        // Filtrado por campaña
        if (item.campaign === 'ALL') return true;
        if (item.campaign === 'R20' && hasR20) return true;
        if (item.campaign === 'R10' && hasR10) return true;
        return false;
    });

    return (
        <header style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            height: '84px',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            padding: '12px 20px',
        }}>
            <style>{`
                .nav-container {
                    background: rgba(10, 15, 29, 0.7);
                    backdrop-filter: blur(12px) saturate(180%);
                    -webkit-backdrop-filter: blur(12px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                    width: 100%;
                    max-width: 1400px;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    padding: 0 24px;
                    justify-content: space-between;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    pointer-events: auto;
                    animation: navSlideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes navSlideDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .nav-links {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .nav-item {
                    color: rgba(255, 255, 255, 0.6);
                    text-decoration: none;
                    font-size: 0.85rem;
                    font-weight: 600;
                    padding: 7px 14px;
                    border-radius: 12px;
                    transition: all 0.3s;
                    position: relative;
                    white-space: nowrap;
                }
                .nav-item:hover {
                    color: white;
                    background: rgba(255, 255, 255, 0.05);
                }
                .nav-item.active {
                    color: white;
                    background: rgba(99, 102, 241, 0.15);
                    box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.3);
                }
                .nav-item.active::after {
                    content: '';
                    position: absolute;
                    bottom: 6px;
                    left: 20%;
                    right: 20%;
                    height: 2px;
                    background: #6366f1;
                    border-radius: 2px;
                    box-shadow: 0 0 8px #6366f1;
                }
                .nav-item.r10-badge {
                    background: rgba(16, 185, 129, 0.08);
                    box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.2);
                }
                .nav-item.r10-badge.active {
                    background: rgba(16, 185, 129, 0.18);
                    box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.4);
                }
                .nav-item.r10-badge.active::after {
                    background: #10b981;
                    box-shadow: 0 0 8px #10b981;
                }
                .logo-section {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }
                .logo-section:hover {
                    transform: scale(1.02);
                }
            `}</style>

            <div className="nav-container">
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <div
                        className="logo-section"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            marginLeft: '30px',
                        }}
                    >
                        <Image
                            src="/icono.png"
                            alt="Logo"
                            width={90}
                            height={90}
                            priority
                            style={{ borderRadius: '0px', objectFit: 'contain' }}
                        />
                    </div>
                </Link>

                <nav className="nav-links">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        const isR10 = item.campaign === 'R10';
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`nav-item ${isActive ? 'active' : ''} ${isR10 ? 'r10-badge' : ''}`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserMenu
                        name={userName}
                        role={userRole}
                        cargo={userCargo}
                        photo={userPhoto}
                    />
                </div>
            </div>
        </header>
    );
}