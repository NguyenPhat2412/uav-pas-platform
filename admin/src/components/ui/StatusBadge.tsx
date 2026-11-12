import {displayLabel} from '@/lib/presentation';
import {cn} from '@/lib/utils';

const tones: Record<string, { badge: string; dot: string }> = {
    AVAILABLE: {badge: 'bg-uav-blue-light text-uav-blue border-blue-200', dot: 'bg-uav-blue'},
    ACTIVE: {badge: 'bg-uav-blue-light text-uav-blue border-blue-200', dot: 'bg-uav-blue'},
    ONLINE: {badge: 'bg-uav-blue-light text-uav-blue border-blue-200', dot: 'bg-uav-blue'},
    COMPLETED: {badge: 'bg-uav-blue-light text-uav-blue border-blue-200', dot: 'bg-uav-blue'},
    CONFIRMED: {badge: 'bg-uav-blue-light text-uav-blue border-blue-200', dot: 'bg-uav-blue'},
    APPROVED: {badge: 'bg-uav-blue-light text-uav-blue border-blue-200', dot: 'bg-uav-blue'},
    RUNNING: {badge: 'bg-uav-blue-light text-uav-blue border-blue-200', dot: 'bg-uav-blue'},
    TAKEOFF: {badge: 'bg-uav-blue-light text-uav-blue border-blue-200', dot: 'bg-uav-blue'},
    MISSION: {badge: 'bg-uav-blue-light text-uav-blue border-blue-200', dot: 'bg-uav-blue'},
    IN_PROGRESS: {badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-600'},
    READY: {badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-600'},
    RESERVED: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    RESOURCE_RESERVED: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    MAINTENANCE: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    PENDING_CONFIRMATION: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    PENDING: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    WARNING: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    DUE_SOON: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    HOLD: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    RETURN_TO_HOME: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    LANDING: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    FAILSAFE_RTH: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    OFFLINE: {badge: 'bg-red-50 text-danger border-red-200', dot: 'bg-danger'},
    SUSPENDED: {badge: 'bg-red-50 text-danger border-red-200', dot: 'bg-danger'},
    FAILED: {badge: 'bg-red-50 text-danger border-red-200', dot: 'bg-danger'},
    ERROR: {badge: 'bg-red-50 text-danger border-red-200', dot: 'bg-danger'},
    OVERDUE: {badge: 'bg-red-50 text-danger border-red-200', dot: 'bg-danger'},
    REVOKED: {badge: 'bg-red-50 text-danger border-red-200', dot: 'bg-danger'},
    EMERGENCY_LANDED: {badge: 'bg-red-50 text-danger border-red-200', dot: 'bg-danger'},
    CANCELLED: {badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'},
    REJECTED: {badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'},
    EXPIRED: {badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'},
    ABORTED: {badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'},
    LANDED: {badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'},
    DRAFT: {badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'},
};

const defaultTone = {badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'};

export function StatusBadge({
    status,
    label,
    className,
}: {
    status?: string;
    label?: string;
    className?: string;
}) {
    const normalized = (status || 'UNKNOWN').toUpperCase();
    const tone = tones[normalized] || defaultTone;
    return (
        <span
            data-status={status}
            className={cn(
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-badge border px-2.5 py-0.5 text-[11px] font-bold uppercase leading-4 tracking-wider',
                tone.badge,
                className,
            )}
        >
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)} aria-hidden="true" />
            {label || displayLabel(status || normalized)}
        </span>
    );
}
