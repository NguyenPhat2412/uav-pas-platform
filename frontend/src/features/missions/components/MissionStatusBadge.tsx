import {displayLabel} from "@/components/shared/presentation";
import type {MissionStatus} from "@/features/missions/types/mission.types";

const statusStyles: Partial<Record<MissionStatus, string>> = {
    COMPLETED: 'border-blue-200 bg-uav-blue-light text-uav-blue',
    IN_PROGRESS: 'border-slate-300 bg-slate-100 text-slate-800',
    READY: 'border-slate-300 bg-slate-100 text-slate-800',
    PENDING_CONFIRMATION: 'border-amber-200 bg-amber-50 text-warning',
    RESOURCE_RESERVED: 'border-amber-200 bg-amber-50 text-warning',
    FAILED: 'border-red-200 bg-red-50 text-danger',
    CANCELLED: 'border-slate-200 bg-slate-50 text-slate-500',
    REJECTED: 'border-slate-200 bg-slate-50 text-slate-500',
};

export function MissionStatusBadge({status}: { status: MissionStatus }) {
    return <span
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-badge border px-3 py-1.5 text-xs font-bold before:size-1.5 before:rounded-full before:bg-current ${statusStyles[status] ?? 'border-border bg-background text-muted'}`}
        data-status={status}>{displayLabel(status)}</span>;
}
