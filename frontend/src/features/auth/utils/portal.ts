import {portalLabel} from '@/components/shared/presentation';
import type {Portal} from '@/features/auth/types/auth.types';

export type {Portal};

// ROLE_PILOT is the self-registration default and carries the customer permission set.
const portalRoles: Record<Portal, readonly string[]> = {
    admin: ['ROLE_ADMIN'],
    operations: ['ROLE_ADMIN', 'ROLE_COMMANDER', 'ROLE_OPERATOR'],
    customer: ['ROLE_ADMIN', 'ROLE_COMMANDER', 'ROLE_OPERATOR', 'ROLE_PILOT'],
};

const portalHomes: Record<Portal, string> = {
    admin: '/admin/dashboard',
    operations: '/operations',
    customer: '/customer/dashboard',
};

export const PORTAL_ROUTES = {
    adminHome: '/admin/dashboard',
    customerHome: '/customer/dashboard',
    operationsHome: '/operations/overview',
    legacyDispatchMissions: '/operations/dispatch/missions',
    legacyAssignedMissions: '/operations/assigned-missions',
} as const;

export function resolveLegacyOperationsTab(tab?: string): string {
    if (tab === 'uavs') return '/operations/uavs';
    if (tab === 'equipment') return '/operations/inventory';
    if (tab === 'media') return '/operations/media';
    if (tab === 'audit') return '/operations/audit';
    return '/operations/stations';
}

export function canUsePortal(role: string | null | undefined, portal: Portal): boolean {
    return !!role && portalRoles[portal].includes(role);
}

export function availablePortalsForRole(role: string | null | undefined): Portal[] {
    const order: Portal[] = ['admin', 'operations', 'customer'];
    return order.filter(portal => canUsePortal(role, portal));
}

export function portalForRole(role: string | null | undefined): Portal {
    if (role === 'ROLE_ADMIN') return 'admin';
    if (canUsePortal(role, 'operations')) return 'operations';
    return 'customer';
}

export function portalHome(portal: Portal): string {
    return portalHomes[portal];
}

export function portalName(portal: Portal): string {
    return portalLabel(portal);
}
