import type {NotificationRecord} from '@/shared/types/notification/notification.types';

export type MobilePortal = 'customer' | 'operations';

const OPERATIONS_ROLES = new Set(['ROLE_ADMIN', 'ROLE_COMMANDER', 'ROLE_OPERATOR']);

/** Whether the signed-in role is permitted to enter the mobile Operations Field Portal. */
export function canAccessOperationsPortal(role: string | null | undefined): boolean {
    return !!role && OPERATIONS_ROLES.has(role);
}

/**
 * Resolves which mobile workspace opens on launch or sign-in:
 * - Customers (`ROLE_PILOT`) always land in `'customer'`.
 * - Staff (`ROLE_OPERATOR`, `ROLE_COMMANDER`, `ROLE_ADMIN`) honour their saved preference, defaulting to `'operations'`.
 */
export function resolveMobilePortal(
    role: string | null | undefined,
    saved?: MobilePortal | null,
): MobilePortal {
    if (!canAccessOperationsPortal(role)) return 'customer';
    if (saved === 'customer' || saved === 'operations') return saved;
    return 'operations';
}

export function resolvePortalEntryHref(portal: MobilePortal): '/operations/missions' | '/customer/home' {
    return portal === 'operations' ? '/operations/missions' : '/customer/home';
}

export type NotificationDeepLink =
    | { pathname: '/customer/invoices/[id]'; params: { id: string } }
    | { pathname: '/operations/sar/[missionId]'; params: { missionId: string } }
    | { pathname: '/operations/mission/[id]'; params: { id: string } }
    | { pathname: '/customer/mission/[id]'; params: { id: string } };

/** Maps an inbox notification row to its mobile screen destination for the active workspace and role. */
export function resolveNotificationTarget(
    item: Pick<NotificationRecord, 'type' | 'referenceType' | 'referenceId'>,
    portal: MobilePortal,
    role?: string | null,
): NotificationDeepLink | null {
    if (!item.referenceId) return null;
    const id = String(item.referenceId);
    const ref = (item.referenceType ?? '').trim().toUpperCase();
    const staffAllowed = portal === 'operations' || canAccessOperationsPortal(role);

    if (ref === 'INVOICE') {
        return {pathname: '/customer/invoices/[id]', params: {id}};
    }
    if ((ref === 'SAR' || item.type === 'SAR_TARGET_FOUND') && staffAllowed) {
        return {pathname: '/operations/sar/[missionId]', params: {missionId: id}};
    }
    if (ref === 'MISSION' || ref === 'PERMIT') {
        if (portal === 'operations' && staffAllowed) {
            return {pathname: '/operations/mission/[id]', params: {id}};
        }
        return {pathname: '/customer/mission/[id]', params: {id}};
    }
    return null;
}
