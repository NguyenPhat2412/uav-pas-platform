'use client';
import {useQuery} from '@tanstack/react-query';
import {MapPin, UserCheck} from 'lucide-react';
import {UavIcon} from '@/components/shared/UavIcon';
import {displayLabel} from '@/components/shared/presentation';
import {useI18n} from '@/contexts/I18nContext';
import {operationsService} from '@/lib/api/resources';
import {useCustomerScope} from '@/lib/query/customer';
import type {Mission} from '@/types/customer';

/** Equipment and crew assigned by dispatch. Operator identity stays private; only assignment state is shown. */
export function MissionResources({mission}: { mission: Mission }) {
    const {t} = useI18n();
    const {key, can, permissionsReady} = useCustomerScope();
    const uav = useQuery({
        queryKey: [...key, 'uav', mission.uavId],
        queryFn: ({signal}) => operationsService.uav(mission.uavId!, signal),
        enabled: mission.uavId != null && permissionsReady && can('UAV_READ'),
    });
    const station = useQuery({
        queryKey: [...key, 'station', mission.stationId],
        queryFn: ({signal}) => operationsService.station(mission.stationId!, signal),
        enabled: mission.stationId != null && permissionsReady && can('STATION_READ'),
    });
    const pending = t('resources.notAssigned');
    const operatorState = mission.operatorId == null ? pending
        : mission.operatorAccepted ? t('resources.operatorAccepted') : t('resources.operatorAssigned');

    return <section className="mission-panel" aria-labelledby="resources-title">
        <header><h2 id="resources-title">{t('resources.title')}</h2></header>
        <div className="mission-panel-body">
            <ul className="resource-cards">
                <li>
                    <span className="resource-icon" aria-hidden="true"><UavIcon size={20}/></span>
                    <div>
                        <small>{t('resources.uav')}</small>
                        {mission.uavId == null ? <strong>{pending}</strong>
                            : uav.data ? <>
                                    <strong>{uav.data.model}</strong>
                                    <span>{uav.data.manufacturer} · {uav.data.serialNumber}</span>
                                    <span>{displayLabel(uav.data.status)}</span>
                                </>
                                : <strong>{uav.isError ? t('resources.unavailable') : t('common.loading')}</strong>}
                    </div>
                </li>
                <li>
                    <span className="resource-icon" aria-hidden="true"><MapPin size={20}/></span>
                    <div>
                        <small>{t('resources.station')}</small>
                        {mission.stationId == null ? <strong>{pending}</strong>
                            : station.data ? <>
                                    <strong>{station.data.name}</strong>
                                    {station.data.address && <span>{station.data.address}</span>}
                                </>
                                : <strong>{station.isError ? t('resources.unavailable') : t('common.loading')}</strong>}
                    </div>
                </li>
                <li>
                    <span className="resource-icon" aria-hidden="true"><UserCheck size={20}/></span>
                    <div>
                        <small>{t('resources.operator')}</small>
                        <strong>{operatorState}</strong>
                        {mission.operatorId != null && <span>{t('resources.operatorPrivacy')}</span>}
                    </div>
                </li>
            </ul>
        </div>
    </section>;
}
