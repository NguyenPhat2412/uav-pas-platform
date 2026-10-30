'use client';
import type {ReactNode} from 'react';
import {MapPin, UserCheck} from 'lucide-react';
import {UavIcon} from '@/components/shared/UavIcon';
import {displayLabel} from '@/components/shared/presentation';
import {useI18n} from '@/providers/I18nContext';
import {useUav} from '@/features/uavs/hooks/useUavs';
import {useStation} from '@/features/stations/hooks/useStations';
import type {Mission} from '@/types/customer';

/** Equipment and crew assigned by dispatch. Operator identity stays private; only assignment state is shown. */
export function MissionResources({mission}: { mission: Mission }) {
    const {t} = useI18n();
    const uav = useUav(mission.uavId ?? undefined);
    const station = useStation(mission.stationId ?? undefined);
    const pending = <strong className="text-sm font-semibold text-muted">{t('resources.notAssigned')}</strong>;
    const state = (query: { isError: boolean }) =>
        <strong className="text-sm font-semibold text-muted">{query.isError ? t('resources.unavailable') : t('common.loading')}</strong>;
    const operatorState = mission.operatorAccepted ? t('resources.operatorAccepted') : t('resources.operatorAssigned');

    return <section className="min-w-0 overflow-hidden rounded-panel border-b border-border bg-card"
                    aria-labelledby="resources-title">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-slate-50/70 px-5 py-3.5 md:px-6">
            <h2 id="resources-title" className="m-0 text-sm font-bold text-slate-800">{t('resources.title')}</h2>
        </header>
        <ul className="m-0 grid list-none grid-cols-1 gap-px bg-slate-200 p-0 md:grid-cols-3">
            <Resource icon={<UavIcon size={20}/>} label={t('resources.uav')}>
                {mission.uavId == null ? pending : uav.data ? <>
                    <strong className="text-sm font-semibold text-foreground">{uav.data.model}</strong>
                    <span className="text-xs text-muted">{uav.data.manufacturer} · {uav.data.serialNumber}</span>
                    <span className="text-xs text-muted">{displayLabel(uav.data.status)}</span>
                </> : state(uav)}
            </Resource>
            <Resource icon={<MapPin size={20}/>} label={t('resources.station')}>
                {mission.stationId == null ? pending : station.data ? <>
                    <strong className="text-sm font-semibold text-foreground">{station.data.name}</strong>
                    {station.data.address && <span className="text-xs text-muted">{station.data.address}</span>}
                </> : state(station)}
            </Resource>
            <Resource icon={<UserCheck size={20}/>} label={t('resources.operator')}>
                {mission.operatorId == null ? pending : <>
                    <strong className="text-sm font-semibold text-foreground">{operatorState}</strong>
                    <span className="text-xs text-muted">{t('resources.operatorPrivacy')}</span>
                </>}
            </Resource>
        </ul>
    </section>;
}

function Resource({icon, label, children}: { icon: ReactNode; label: string; children: ReactNode }) {
    return <li className="flex items-start gap-3 bg-white p-4 md:p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-panel bg-primary/10 text-primary" aria-hidden="true">{icon}</span>
        <div className="grid min-w-0 gap-0.5 break-words">
            <small className="text-xs text-muted">{label}</small>
            {children}
        </div>
    </li>;
}
