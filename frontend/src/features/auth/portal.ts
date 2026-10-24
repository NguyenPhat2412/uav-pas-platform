import {portalLabel} from '@/components/shared/presentation';

export type Portal = 'admin' | 'operations' | 'customer';

// ROLE_PILOT is the self-registration default and carries the customer permission set.
const portalRoles: Record<Portal, readonly string[]> = {
    admin: ['ROLE_ADMIN'],
    operations: ['ROLE_ADMIN', 'ROLE_COMMANDER', 'ROLE_OPERATOR'],
    customer: ['ROLE_PILOT'],
};

const portalHomes: Record<Portal, string> = {
    admin: '/admin/dashboard',
    operations: '/operations',
    customer: '/customer/dashboard',
};

export function canUsePortal(role: string | null | undefined, portal: Portal): boolean {
    return !!role && portalRoles[portal].includes(role);
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
