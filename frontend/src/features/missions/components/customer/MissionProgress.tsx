import {Check, X} from 'lucide-react';
import type {MissionStatus} from '@/types/customer';
import {useI18n} from '@/contexts/I18nContext';

const steps = [
    {label: 'progress.draft', statuses: ['DRAFT']},
    {label: 'progress.pending', statuses: ['PENDING_CONFIRMATION']},
    {label: 'progress.confirmed', statuses: ['CONFIRMED', 'RESOURCE_RESERVED', 'READY']},
    {label: 'progress.inProgress', statuses: ['IN_PROGRESS']},
    {label: 'progress.completed', statuses: ['COMPLETED']},
] as const;

// Stopped missions carry no history here, so they are pinned to the stage where that outcome happens.
const stopped: Partial<Record<MissionStatus, { index: number; label: string }>> = {
    CANCELLED: {index: 1, label: 'progress.cancelled'},
    REJECTED: {index: 1, label: 'progress.rejected'},
    FAILED: {index: 3, label: 'progress.failed'},
};

export function MissionProgress({status}: { status: MissionStatus }) {
    const {t} = useI18n();
    const halt = stopped[status];
    const current = halt?.index ?? steps.findIndex(step => (step.statuses as readonly string[]).includes(status));
    return <ol className="mission-progress" aria-label={t('progress.label')}>
        {steps.map((step, index) => {
            const isHalt = halt && index === current;
            const state = isHalt ? 'stopped' : index < current || status === 'COMPLETED' ? 'done' : index === current ? 'current' : 'upcoming';
            return <li key={step.label} className={`mission-progress-step is-${state}`}
                       aria-current={state === 'current' || state === 'stopped' ? 'step' : undefined}>
                <span className="mission-progress-dot" aria-hidden="true">
                    {state === 'done' ? <Check size={14}/> : state === 'stopped' ? <X size={14}/> : index + 1}
                </span>
                <span className="mission-progress-label">{t(isHalt ? halt.label : step.label)}</span>
            </li>;
        })}
    </ol>;
}
