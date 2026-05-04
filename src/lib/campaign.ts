// src/lib/campaign.ts

export type Campaign = 'R20' | 'R10';

/**
 * Parsea el string de campaña de un usuario y devuelve un array limpio.
 */
export function parseCampaigns(raw: string | undefined | null): Campaign[] {
    if (!raw) return [];
    return raw
        .split(',')
        .map(c => c.trim().toUpperCase())
        .filter((c): c is Campaign => c === 'R20' || c === 'R10');
}

/**
 * Verifica si un usuario tiene acceso a una campaña específica.
 * ADMIN siempre tiene acceso a todas.
 */
export function hasCampaignAccess(
    userCampaigns: string | undefined,
    userRole: string | undefined,
    target: Campaign
): boolean {
    if (userRole === 'ADMIN') return true;
    const campaigns = parseCampaigns(userCampaigns);
    return campaigns.includes(target);
}

/**
 * Devuelve la lista efectiva de campañas que el usuario puede ver.
 * ADMIN ve todas, el resto solo las suyas.
 */
export function getEffectiveCampaigns(
    userCampaigns: string | undefined,
    userRole: string | undefined
): Campaign[] {
    if (userRole === 'ADMIN') return ['R20', 'R10'];
    return parseCampaigns(userCampaigns);
}

export function hasMultipleCampaigns(
    userCampaigns: string | undefined,
    userRole: string | undefined
): boolean {
    return getEffectiveCampaigns(userCampaigns, userRole).length > 1;
}

export function getDefaultCampaign(
    userCampaigns: string | undefined,
    userRole: string | undefined
): Campaign | null {
    const list = getEffectiveCampaigns(userCampaigns, userRole);
    if (list.length === 0) return null;
    if (list.includes('R20')) return 'R20';
    return list[0];
}

// ============================================
// HELPERS DE ROLES
// ============================================

export type UserRole = 'ADMIN' | 'SPECIAL' | 'STANDAR' | 'BACKOFFICE';

export function isBackOffice(role: string | undefined): boolean {
    return role === 'BACKOFFICE';
}

export function isSupervisor(role: string | undefined): boolean {
    return role === 'SPECIAL';
}

export function isEjecutivo(role: string | undefined): boolean {
    return role === 'STANDAR';
}

export function isAdmin(role: string | undefined): boolean {
    return role === 'ADMIN';
}

/**
 * ¿El usuario puede cambiar estados de ventas en Mesa de Control?
 * Solo ADMIN y BACKOFFICE (con la campaña correspondiente).
 */
export function canManageMesaControl(
    role: string | undefined,
    userCampaigns: string | undefined,
    target: Campaign
): boolean {
    if (role === 'ADMIN') return true;
    if (role !== 'BACKOFFICE') return false;
    return hasCampaignAccess(userCampaigns, role, target);
}