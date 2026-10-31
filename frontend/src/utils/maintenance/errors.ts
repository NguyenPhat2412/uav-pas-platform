import {ApiError} from '@/lib/api';
import type {Translate} from '@/types';

const errorCodes = new Set([
    'MAINTENANCE_VERSION_CHANGED',
    'MAINTENANCE_ACTIVE_ORDER_EXISTS',
    'MAINTENANCE_UAV_HAS_ACTIVE_ORDER',
    'MAINTENANCE_SCHEDULE_HAS_ACTIVE_ORDER',
    'MAINTENANCE_ORDER_INVALID_STATUS',
    'MAINTENANCE_ORDER_INVALID_STATE',
    'MAINTENANCE_UAV_STATE_CHANGED',
    'MAINTENANCE_SCHEDULE_UAV_MISMATCH',
    'MAINTENANCE_ORDER_TERMINAL',
    'UAV_HAS_ACTIVE_MISSION',
    'UAV_NOT_AVAILABLE',
    'MAINTENANCE_UAV_BUSY',
    'MAINTENANCE_SCHEDULE_PAUSED',
]);

export function maintenanceError(error: unknown, t: Translate) {
    if (error instanceof ApiError) {
        if (error.status === 403) return t('opsAssets.maintenance.errors.forbidden');
        if (error.status === 404) return t('opsAssets.maintenance.errors.notFound');
        if (errorCodes.has(error.message)) return t(`opsAssets.maintenance.errors.${error.message}`);
        if (error.status === 409) return t('opsAssets.maintenance.errors.conflict');
        if (error.status === 400) return t('opsAssets.maintenance.errors.badRequest');
        return t('opsAssets.maintenance.errors.unconfirmed');
    }
    return error instanceof Error ? error.message : t('opsAssets.maintenance.errors.generic');
}
