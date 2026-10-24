import {displayLabel} from "@/components/shared/presentation";
import {cn} from '@/lib/utils';

const tones: Record<string, { badge: string; dot: string }> = {
    AVAILABLE: {badge: 'bg-emerald-50 text-success border-emerald-200', dot: 'bg-success'},
    ACTIVE: {badge: 'bg-emerald-50 text-success border-emerald-200', dot: 'bg-success'},
    ONLINE: {badge: 'bg-emerald-50 text-success border-emerald-200', dot: 'bg-success'},
    IN_PROGRESS: {badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-600'},
    READY: {badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-600'},
    RESERVED: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    MAINTENANCE: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    PENDING_CONFIRMATION: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    WARNING: {badge: 'bg-amber-50 text-warning border-amber-200', dot: 'bg-warning'},
    OFFLINE: {badge: 'bg-red-50 text-danger border-red-200', dot: 'bg-danger'},
    SUSPENDED: {badge: 'bg-red-50 text-danger border-red-200', dot: 'bg-danger'},
    FAILED: {badge: 'bg-red-50 text-danger border-red-200', dot: 'bg-danger'},
    ERROR: {badge: 'bg-red-50 text-danger border-red-200', dot: 'bg-danger'},
    CANCELLED: {badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'},
    DRAFT: {badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'},
};

const defaultTone = {badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'};

export function StatusBadge({status, label}: { status?: string; label?: string }) {
    const normalized = (status || 'UNKNOWN').toUpperCase();
    const tone = tones[normalized] || defaultTone;
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold leading-none', tone.badge)}>
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', tone.dot)}/>
            {label || displayLabel(normalized)}
        </span>
    );
}
