'use client';

import {displayLabel, serviceName} from '@/lib/presentation';
import {formatVndCompact, pricingUnitLabel} from '@/forms/marketplace/marketplace-forms';
import {useI18n} from '@/providers/I18nContext';
import type {MarketplaceListing} from '@/types/marketplace/marketplace.types';
import type {MissionInput, UavService} from '@/types/customer';
import {defaultFlightPlan} from '@/types/mission/flight-plan.types';
import {flightGeometry} from '@/utils/mission/flight-geometry';

interface MissionReviewSummaryListProps {
    form: MissionInput;
    activeListing?: MarketplaceListing | null;
    effectiveUnits?: number;
    estimatedSubtotal: number | null;
    effectiveOpenRfq: boolean;
    selectedService?: UavService;
}

export function MissionReviewSummaryList({
    form,
    activeListing,
    effectiveUnits,
    estimatedSubtotal,
    effectiveOpenRfq,
    selectedService,
}: MissionReviewSummaryListProps) {
    const {t, formatDate, formatNumber} = useI18n();
    const plan = form.flightPlan ?? defaultFlightPlan();
    const planArea = flightGeometry(plan).areaSquareMeters;
    const flightArea =
        plan.areaType === 'POLYGON'
            ? `${t('planner.tool.polygon')}${planArea != null ? ` · ${formatNumber(Math.round(planArea / 100) / 100)} ha` : ''}`
            : plan.areaType === 'CIRCLE'
              ? `${t('planner.tool.circle')} · ${formatNumber(plan.radiusMeters ?? 0)} m`
              : t('planner.tool.takeoff');

    return (
        <dl className="m-0 grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-slate-200 bg-slate-200 tabular-nums sm:grid-cols-2 lg:grid-cols-4 [&>div]:bg-white [&>div]:p-3.5 [&_dd]:m-0 [&_dd]:mt-1 [&_dd]:break-words [&_dd]:whitespace-pre-wrap [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foreground [&_dt]:text-xs [&_dt]:text-muted">
            <div>
                <dt>{t('missionForm.title')}</dt>
                <dd>{form.title.trim()}</dd>
            </div>
            {activeListing && estimatedSubtotal != null && (
                <div>
                    <dt>Gói thuê Sàn UAV & Tạm tính</dt>
                    <dd>
                        {activeListing.title} · {effectiveUnits} {pricingUnitLabel(activeListing.pricingModel)} (
                        {formatVndCompact(estimatedSubtotal)})
                    </dd>
                </div>
            )}
            {effectiveOpenRfq && (
                <div>
                    <dt>Hình thức điều phối</dt>
                    <dd>UAV PAS điều phối đội bay đã xác minh</dd>
                </div>
            )}
            <div>
                <dt>{t('missionCreate.service')}</dt>
                <dd>{selectedService ? serviceName(selectedService) : t('missionCreate.noService')}</dd>
            </div>
            <div>
                <dt>{t('missions.type')}</dt>
                <dd>{displayLabel(form.missionType)}</dd>
            </div>
            <div>
                <dt>{t('missionForm.requestedDate')}</dt>
                <dd>{form.requestedDate}</dd>
            </div>
            <div>
                <dt>{t('missionCreate.time')}</dt>
                <dd>
                    {formatDate(form.startTime)} → {formatDate(form.expectedEndTime)}
                </dd>
            </div>
            <div>
                <dt>{t('missionForm.location')}</dt>
                <dd>{form.locationName.trim()}</dd>
            </div>
            <div>
                <dt>{t('missionForm.priority')}</dt>
                <dd>{displayLabel(form.priority ?? 'NORMAL')}</dd>
            </div>
            <div>
                <dt>{t('missionCreate.coordinates')}</dt>
                <dd>
                    {t('missionCreate.coordinatesValue', {
                        lat: form.latitude ?? t('missionCreate.notEntered'),
                        lng: form.longitude ?? t('missionCreate.notEntered'),
                    })}
                </dd>
            </div>
            <div>
                <dt>{t('planner.label')}</dt>
                <dd>{flightArea}</dd>
            </div>
            <div>
                <dt>{t('flightSpec.altitude')}</dt>
                <dd>{plan.altitudeAglMeters} m</dd>
            </div>
            <div>
                <dt>{t('flightSpec.gsd')}</dt>
                <dd>{t(`flightSpec.gsdOption.${plan.targetGsdCm.toFixed(1).replace('.', '_')}`)}</dd>
            </div>
            <div>
                <dt>
                    {t('flightSpec.forwardOverlap')} / {t('flightSpec.sideOverlap')}
                </dt>
                <dd>
                    {plan.forwardOverlap}% / {plan.sideOverlap}%
                </dd>
            </div>
            <div className={plan.permitSupport ? 'sm:col-span-2' : 'sm:col-span-2 lg:col-span-4'}>
                <dt>{t('flightSpec.sensors')}</dt>
                <dd>
                    {plan.sensors.length
                        ? plan.sensors.map(sensor => t(`flightSpec.sensor.${sensor}.name`)).join(', ')
                        : t('missionCreate.notEntered')}
                </dd>
            </div>
            {plan.permitSupport && (
                <div className="sm:col-span-2">
                    <dt>{t('flightSpec.permit')}</dt>
                    <dd>✓</dd>
                </div>
            )}
            {plan.obstacles?.trim() && (
                <div className="sm:col-span-2 lg:col-span-4">
                    <dt>{t('flightSpec.obstacles')}</dt>
                    <dd>{plan.obstacles.trim()}</dd>
                </div>
            )}
            {form.description && (
                <div className="sm:col-span-2 lg:col-span-4">
                    <dt>{t('missionForm.description')}</dt>
                    <dd>{form.description}</dd>
                </div>
            )}
            {form.notes && (
                <div className="sm:col-span-2 lg:col-span-4">
                    <dt>{t('missionForm.notes')}</dt>
                    <dd>{form.notes}</dd>
                </div>
            )}
        </dl>
    );
}
