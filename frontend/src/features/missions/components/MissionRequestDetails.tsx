import {useI18n} from '@/contexts/I18nContext';
import type {MissionRequestDetailsData as RequestDetails} from '@/features/missions/types/mission.types';

/** The original customer request, shared by the customer and dispatch detail views. */
export function MissionRequestDetails({mission}: { mission: RequestDetails }) {
    const {t, formatNumber} = useI18n();
    const plan = mission.flightPlan;

    return (
        <div className="mt-5 border-t border-border pt-4">
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-6 gap-y-4">
                <div className="min-w-0">
                    <dt className="mb-1 text-xs font-semibold text-muted">{t('missionShared.requestedDate')}</dt>
                    <dd className="m-0 break-words text-sm leading-relaxed text-foreground">
                        <time dateTime={mission.requestedDate}>{mission.requestedDate.split('-').reverse().join('/')}</time>
                    </dd>
                </div>
                {(mission.latitude != null || mission.longitude != null) && (
                    <div className="min-w-0">
                        <dt className="mb-1 text-xs font-semibold text-muted">{t('missionShared.requestedCoordinates')}</dt>
                        <dd className="m-0 break-words text-sm leading-relaxed text-foreground">
                            {t('missionShared.coordinatesValue', {
                                lat: mission.latitude != null ? mission.latitude.toFixed(6) : t('missionShared.notEntered'),
                                lng: mission.longitude != null ? mission.longitude.toFixed(6) : t('missionShared.notEntered')
                            })}
                        </dd>
                    </div>
                )}
                {plan && (
                    <>
                        <div className="min-w-0">
                            <dt className="mb-1 text-xs font-semibold text-muted">{t('missionMonitor.area')}</dt>
                            <dd className="m-0 break-words text-sm leading-relaxed text-foreground">
                                {plan.areaSquareMeters
                                    ? `${formatNumber(Math.round(plan.areaSquareMeters / 100) / 100)} ha (${formatNumber(Math.round(plan.areaSquareMeters))} m²)`
                                    : t(`missionMonitor.areaType.${plan.areaType}`)}
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="mb-1 text-xs font-semibold text-muted">{t('missionMonitor.altitude')}</dt>
                            <dd className="m-0 break-words text-sm leading-relaxed text-foreground">
                                {plan.altitudeAglMeters} m · GSD {plan.targetGsdCm} cm
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="mb-1 text-xs font-semibold text-muted">{t('missionMonitor.overlap')}</dt>
                            <dd className="m-0 break-words text-sm leading-relaxed text-foreground">
                                {plan.forwardOverlap}% / {plan.sideOverlap}%
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="mb-1 text-xs font-semibold text-muted">{t('missionMonitor.sensors')}</dt>
                            <dd className="m-0 break-words text-sm leading-relaxed text-foreground">
                                {plan.sensors.map(s => t(`flightSpec.sensor.${s}.name`)).join(', ')}
                            </dd>
                        </div>
                        {plan.takeoffLatitude != null && plan.takeoffLongitude != null && (
                            <div className="min-w-0">
                                <dt className="mb-1 text-xs font-semibold text-muted">{t('planner.takeoff')}</dt>
                                <dd className="m-0 break-words text-sm leading-relaxed text-foreground">
                                    {plan.takeoffLatitude.toFixed(6)}, {plan.takeoffLongitude.toFixed(6)}
                                </dd>
                            </div>
                        )}
                        {plan.obstacles && (
                            <div className="col-span-full min-w-0">
                                <dt className="mb-1 text-xs font-semibold text-muted">{t('planner.obstacles')}</dt>
                                <dd className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{plan.obstacles}</dd>
                            </div>
                        )}
                    </>
                )}
                {mission.notes && (
                    <div className="col-span-full min-w-0">
                        <dt className="mb-1 text-xs font-semibold text-muted">{t('missionShared.requestNotes')}</dt>
                        <dd className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{mission.notes}</dd>
                    </div>
                )}
            </dl>
        </div>
    );
}
