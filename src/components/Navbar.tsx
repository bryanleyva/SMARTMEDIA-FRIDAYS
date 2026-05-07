'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import UserMenu from './UserMenu';
import { useTheme } from './ThemeProvider';

interface NavbarProps {
    userRole?: string;
    userName?: string | null;
    userCargo?: string;
    userPhoto?: string;
    userCampana?: string;   // ← viene de la columna CAMPAÑA del Sheets
}

interface NavItem {
    name: string;
    path: string;
    campaign?: 'R20' | 'R10' | 'ALL';
    roles?: string[];
}

function parseCampaigns(campana?: string, role?: string): string[] {
    if (!campana || campana.trim() === '') {
        if (role === 'ADMIN' || role === 'JEFE_BO') return ['R20', 'R10'];
        return ['R20'];
    }
    const parsed = campana
        .toUpperCase()
        .split(/[\s,;|]+/)
        .map(s => s.trim())
        .filter(s => s === 'R20' || s === 'R10');
    return parsed.length > 0 ? parsed : ['R20'];
}

function detectCampaignFromPath(path: string): 'R20' | 'R10' | null {
    const r10Paths = ['/deals-r10', '/ingresos-r10', '/mesa-control-r10', '/supervisor-r10', '/reporte-r10'];
    if (r10Paths.some(p => path.startsWith(p))) return 'R10';
    const r20Paths = ['/leads', '/deals', '/postventa', '/linker'];
    if (r20Paths.some(p => path.startsWith(p))) return 'R20';
    return null;
}

export default function Navbar({ userRole, userName, userCargo, userPhoto, userCampana }: NavbarProps) {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();

    const isHR = userCargo?.trim().toUpperCase() === 'RECURSOS HUMANOS';
    const campaigns = parseCampaigns(userCampana, userRole);
    const hasR20 = campaigns.includes('R20');
    const hasR10 = campaigns.includes('R10');
    const hasBoth = hasR20 && hasR10;

    const isPostVenta =
        userRole === 'ADMIN' ||
        userRole === 'ANDREA' ||
        userRole === 'JEFE_BO' ||
        userCargo?.trim().toUpperCase().includes('POSTVENTA');

    // Initialize from path only (no localStorage on SSR)
    const [activeCampaign, setActiveCampaign] = useState<'R20' | 'R10'>(() => {
        const fromPath = detectCampaignFromPath(pathname);
        if (fromPath && campaigns.includes(fromPath)) return fromPath;
        return hasR20 ? 'R20' : 'R10';
    });

    // After hydration: restore from localStorage if no path signal
    useEffect(() => {
        const fromPath = detectCampaignFromPath(pathname);
        if (fromPath && campaigns.includes(fromPath)) {
            setActiveCampaign(fromPath);
            return;
        }
        const saved = localStorage.getItem('friday-nav-campaign') as 'R20' | 'R10' | null;
        if (saved && campaigns.includes(saved)) setActiveCampaign(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-switch when navigating to a campaign-specific route
    useEffect(() => {
        const fromPath = detectCampaignFromPath(pathname);
        if (fromPath && campaigns.includes(fromPath)) setActiveCampaign(fromPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const handleCampaignSwitch = (campaign: 'R20' | 'R10') => {
        setActiveCampaign(campaign);
        localStorage.setItem('friday-nav-campaign', campaign);
    };

    const allNavItems: NavItem[] = [
        { name: 'Inicio',             path: '/',                 campaign: 'ALL' },
        // --- R20 ---
        { name: 'Leads',              path: '/leads',            campaign: 'R20', roles: ['STANDAR', 'SPECIAL', 'ADMIN'] },
        { name: 'Deals',              path: '/deals',            campaign: 'R20', roles: ['STANDAR', 'SPECIAL', 'ADMIN'] },
        { name: 'Post Venta',         path: '/postventa',        campaign: 'R20' },
        { name: 'Linker',             path: '/linker',           campaign: 'R20', roles: ['STANDAR', 'SPECIAL', 'ADMIN', 'BACKOFFICE', 'JEFE_BO'] },
        // --- R10 ---
        { name: 'Deals R10',          path: '/deals-r10',        campaign: 'R10', roles: ['STANDAR', 'ADMIN'] },
        { name: 'Ingresos',           path: '/ingresos-r10',     campaign: 'R10', roles: ['STANDAR', 'SPECIAL', 'ADMIN'] },
        { name: 'Mesa Control R10',   path: '/mesa-control-r10', campaign: 'R10', roles: ['BACKOFFICE', 'ADMIN', 'JEFE_BO'] },
        { name: 'Supervisor R10',     path: '/supervisor-r10',   campaign: 'R10', roles: ['SPECIAL', 'ADMIN'] },
        { name: 'Reporte R10',        path: '/reporte-r10',      campaign: 'R10' },
        // --- Compartido ---
        { name: 'Reporte',            path: '/reporte',          campaign: 'ALL' },
    ];

    const navItems = allNavItems.filter(item => {
        if (isHR) return item.name === 'Inicio' || item.name === 'Reporte';

        if (item.name === 'Post Venta' && !isPostVenta) return false;

        if (item.roles && item.roles.length > 0) {
            if (!userRole || !item.roles.includes(userRole)) return false;
        }

        if (item.campaign === 'ALL') return true;
        if (item.campaign === 'R20' && activeCampaign === 'R20' && hasR20) return true;
        if (item.campaign === 'R10' && activeCampaign === 'R10' && hasR10) return true;
        return false;
    });

    return (
        <header style={{
            position: 'fixed',
            top: '0', left: '0', right: '0',
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
                    width: 100%; max-width: 1400px; height: 100%;
                    display: flex; align-items: center; padding: 0 24px;
                    justify-content: space-between;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    pointer-events: auto;
                    animation: navSlideDown 0.8s cubic-bezier(0.16,1,0.3,1) forwards;
                }
                @keyframes navSlideDown {
                    from { opacity:0; transform:translateY(-20px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                .nav-links { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
                .nav-item {
                    color: rgba(255,255,255,0.6);
                    text-decoration: none;
                    font-size: 0.85rem; font-weight: 600;
                    padding: 7px 14px; border-radius: 12px;
                    transition: all 0.3s; position: relative; white-space: nowrap;
                }
                .nav-item:hover { color:white; background:rgba(255,255,255,0.05); }
                .nav-item.active {
                    color:white;
                    background:rgba(99,102,241,0.15);
                    box-shadow:inset 0 0 0 1px rgba(99,102,241,0.3);
                }
                .nav-item.active::after {
                    content:''; position:absolute; bottom:6px; left:20%; right:20%;
                    height:2px; background:#6366f1; border-radius:2px; box-shadow:0 0 8px #6366f1;
                }
                .nav-item.r10-badge {
                    background:rgba(16,185,129,0.08);
                    box-shadow:inset 0 0 0 1px rgba(16,185,129,0.2);
                }
                .nav-item.r10-badge.active {
                    background:rgba(16,185,129,0.18);
                    box-shadow:inset 0 0 0 1px rgba(16,185,129,0.4);
                }
                .nav-item.r10-badge.active::after { background:#10b981; box-shadow:0 0 8px #10b981; }
                .logo-section { display:flex; align-items:center; cursor:pointer; }
                .logo-section:hover { transform:scale(1.02); }

                /* Campaign switcher */
                .nav-campaign-switcher {
                    display: flex;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px;
                    padding: 3px;
                    gap: 2px;
                }
                .nav-campaign-btn {
                    padding: 5px 13px;
                    border-radius: 7px;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    border: none;
                    cursor: pointer;
                    background: transparent;
                    color: rgba(255,255,255,0.4);
                    transition: all 0.2s;
                }
                .nav-campaign-btn:hover {
                    color: white;
                    background: rgba(255,255,255,0.06);
                }
                .nav-campaign-btn.active-r20 {
                    background: rgba(99,102,241,0.18);
                    color: white;
                    box-shadow: inset 0 0 0 1px rgba(99,102,241,0.35);
                }
                .nav-campaign-btn.active-r10 {
                    background: rgba(16,185,129,0.18);
                    color: white;
                    box-shadow: inset 0 0 0 1px rgba(16,185,129,0.35);
                }
            `}</style>

            <div className="nav-container">
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <div className="logo-section" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', marginLeft:'30px' }}>
                        <Image src="/icono.png" alt="Logo" width={90} height={90} priority style={{ borderRadius:'0px', objectFit:'contain' }} />
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

                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    {hasBoth && !isHR && (
                        <div className="nav-campaign-switcher">
                            <button
                                className={`nav-campaign-btn ${activeCampaign === 'R20' ? 'active-r20' : ''}`}
                                onClick={() => handleCampaignSwitch('R20')}
                            >
                                R20
                            </button>
                            <button
                                className={`nav-campaign-btn ${activeCampaign === 'R10' ? 'active-r10' : ''}`}
                                onClick={() => handleCampaignSwitch('R10')}
                            >
                                R10
                            </button>
                        </div>
                    )}

                    <button
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.85rem',
                            background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(10,30,63,0.07)',
                            border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(10,30,63,0.12)'}`,
                            borderRadius: '999px',
                            cursor: 'pointer',
                            color: theme === 'dark' ? '#94a3b8' : '#374151',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            letterSpacing: '0.02em',
                        }}
                    >
                        {theme === 'dark' ? (
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                            </svg>
                        ) : (
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                            </svg>
                        )}
                    </button>
                    <UserMenu name={userName} role={userRole} cargo={userCargo} photo={userPhoto} />
                </div>
            </div>
        </header>
    );
}
