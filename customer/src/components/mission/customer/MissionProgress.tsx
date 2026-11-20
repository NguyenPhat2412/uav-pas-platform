import {Check, X} from 'lucide-react';
import type {MissionStatus} from '@/types/customer';
import {useI18n} from '@/providers/I18nContext';

const steps = [
    {label: 'progress.draft', statuses: ['DRAFT']},
    {label: 'progress.pending', statuses: ['PENDING_DISPATCH', 'PENDING_PROVIDER', 'PENDING_CONFIRMATION']},
    {label: 'progress.confirmed', statuses: ['ACCEPTED', 'SCHEDULED', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY']},
    {label: 'progress.inProgress', statuses: ['IN_FLIGHT', 'IN_PROGRESS']},
    {label: 'progress.completed', statuses: ['DELIVERED', 'COMPLETED', 'REVIEWED']},
] as const;

const stopped: Partial<Record<MissionStatus, { index: number; label: string }>> = {
    CANCELLED: {index: 1, label: 'progress.cancelled'},
    REJECTED: {index: 1, label: 'progress.rejected'},
    FAILED: {index: 3, label: 'progress.failed'},
};

export function MissionProgress({status}: { status: MissionStatus }) {
    const {t} = useI18n();
    const halt = stopped[status];
    const current = halt?.index ?? steps.findIndex(step => (step.statuses as readonly string[]).includes(status));
    const finishedSuccess = ['DELIVERED', 'COMPLETED', 'REVIEWED'].includes(status);

    return (
        <ol
            className="m-0 flex list-none flex-col gap-3 rounded-panel border-b border-border bg-card px-5 py-4.5 sm:flex-row sm:gap-0"
            aria-label={t('progress.label')}
        >
            {steps.map((step, index) => {
                const isHalt = halt && index === current;
                const state = isHalt
                    ? 'stopped'
                    : index < current || finishedSuccess
                      ? 'done'
                      : index === current
                        ? 'current'
                        : 'upcoming';
                const dotClass =
                    state === 'done'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : state === 'current'
                          ? 'border-primary bg-primary text-white ring-4 ring-uav-red-light'
                          : state === 'stopped'
                            ? 'border-danger bg-danger text-white'
                            : 'border-border bg-card text-muted';
                const labelClass =
                    state === 'stopped'
                        ? 'line-clamp-2 text-xs leading-tight font-bold text-danger'
                        : state === 'current'
                          ? 'line-clamp-2 text-xs leading-tight font-bold text-primary'
                          : 'line-clamp-2 text-xs leading-tight text-muted';
                return (
                    <li
                        key={step.label}
                        className={`relative flex min-w-0 flex-1 flex-row items-center gap-2 text-left sm:flex-col sm:text-center ${
                            index > 0
                                ? `sm:before:absolute sm:before:top-3.5 sm:before:right-[calc(50%+18px)] sm:before:left-[calc(-50%+18px)] sm:before:h-0.5 sm:before:content-[''] ${
                                      state === 'upcoming' ? 'sm:before:bg-border' : 'sm:before:bg-slate-800'
                                  }`
                                : ''
                        }`}
                        aria-current={state === 'current' || state === 'stopped' ? 'step' : undefined}
                    >
                        <span
                            className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${dotClass}`}
                            aria-hidden="true"
                        >
                            {state === 'done' ? <Check size={14}/> : state === 'stopped' ? <X size={14}/> : index + 1}
                        </span>
                        <span className={labelClass}>{t(isHalt ? halt.label : step.label)}</span>
                    </li>
                );
            })}
        </ol>
    );
}
