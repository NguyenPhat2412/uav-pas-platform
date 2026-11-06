'use client';

import {useEffect, useId, useMemo, useState} from 'react';
import {AlertTriangle, CheckCircle2, ShieldAlert, ShieldBan} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import {useAirspaceCheck} from '@/hooks/airspace/useAirspace';
import {toAirspaceCheckInput} from '@/forms/airspace/airspace-zone-form';
import {defaultFlightPlan} from '@/types/mission/flight-plan.types';
import type {AirspaceClearance, AirspaceZoneType} from '@/types/airspace/airspace.types';
import type {MissionInput} from '@/types/mission/mission.types';

type PlannedAirspaceForm = Pick<MissionInput, 'flightPlan' | 'latitude' | 'longitude'>;

export const AIRSPACE_CLEARANCE_TONE: Record<AirspaceClearance, string> = {
    CLEAR: 'bg-sky-50 text-uav-blue border-sky-200',
    CAUTION: 'bg-amber-50 text-amber-800 border-amber-200',
    PERMIT_REQUIRED: 'bg-amber-100/80 text-amber-900 border-amber-300',
    BLOCKED: 'bg-red-50 text-danger border-red-200',
};

export const AIRSPACE_ZONE_TYPE_TONE: Record<AirspaceZoneType, string> = {
    PROHIBITED: 'bg-red-50 text-danger border-red-200',
    RESTRICTED: 'bg-amber-50 text-amber-800 border-amber-200',
    WARNING: 'bg-sky-50 text-uav-blue border-sky-200',
};

export function AirspaceClearanceBadge({
    clearance,
    className,
}: {
    clearance: AirspaceClearance;
    className?: string;
}) {
    const {t} = useI18n();
    return (
        <span
            className={cn(
                'inline-flex items-center whitespace-nowrap rounded-badge border px-2 py-0.5 text-xs font-bold',
                AIRSPACE_CLEARANCE_TONE[clearance],
                className,
            )}
        >
            {t(`airspace.clearance.${clearance}`)}
        </span>
    );
}

export function MissionAirspaceAdvisor<T extends PlannedAirspaceForm>({
    form,
    onChange,
    className,
}: {
    form: T;
    onChange?: (update: (value: T) => T) => void;
    className?: string;
}) {
    const {t, formatNumber} = useI18n();
    const titleId = useId();
    const immediateInput = useMemo(
        () => toAirspaceCheckInput(form.flightPlan, form.latitude, form.longitude),
        [form.flightPlan, form.latitude, form.longitude],
    );
    const serializedImmediate = useMemo(
        () => (immediateInput ? JSON.stringify(immediateInput) : ''),
        [immediateInput],
    );
    const [debouncedSerialized, setDebouncedSerialized] = useState(serializedImmediate);

    useEffect(() => {
        if (!serializedImmediate) {
            const clearTimer = window.setTimeout(() => setDebouncedSerialized(''), 0);
            return () => window.clearTimeout(clearTimer);
        }
        const timer = window.setTimeout(() => {
            setDebouncedSerialized(serializedImmediate);
        }, 250);
        return () => window.clearTimeout(timer);
    }, [serializedImmediate]);

    const checkInput = useMemo(
        () => (debouncedSerialized ? (JSON.parse(debouncedSerialized) as NonNullable<typeof immediateInput>) : null),
        [debouncedSerialized],
    );

    const located = immediateInput != null;
    const query = useAirspaceCheck(checkInput, located && checkInput != null);
    const data = located ? (query.data ?? null) : null;
    const isChecking = located && (serializedImmediate !== debouncedSerialized || query.isPending);

    const Icon =
        data?.clearance === 'BLOCKED'
            ? ShieldBan
            : data?.clearance === 'PERMIT_REQUIRED' || data?.clearance === 'CAUTION'
              ? AlertTriangle
              : data?.clearance === 'CLEAR'
                ? CheckCircle2
                : ShieldAlert;

    return (
        <section
            className={cn('min-w-0 overflow-hidden rounded-panel border border-border bg-card', className)}
            aria-labelledby={titleId}
        >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h2 id={titleId} className="m-0 inline-flex items-center gap-2 text-base font-bold text-foreground">
                    <Icon size={18} aria-hidden="true" />
                    {t('airspace.advisor.title')}
                </h2>
                {data && <AirspaceClearanceBadge clearance={data.clearance} />}
            </header>
            <div className="grid gap-4 px-5 py-4">
                {!located ? (
                    <p className="m-0 text-sm text-muted" role="status">
                        {t('airspace.advisor.pickLocation')}
                    </p>
                ) : !data ? (
                    <p className="m-0 text-sm text-muted" role="status">
                        {isChecking ? t('common.loading') : query.isError ? t('airspace.advisor.loadError') : t('airspace.advisor.pickLocation')}
                    </p>
                ) : (
                    <>
                        <div
                            className={cn(
                                'flex flex-wrap items-center justify-between gap-3 rounded-panel border px-3.5 py-2.5 text-sm',
                                AIRSPACE_CLEARANCE_TONE[data.clearance],
                            )}
                            role="status"
                        >
                            <span className="font-medium">{t(`airspace.advisor.summary.${data.clearance}`)}</span>
                            {data.requiresPermit && !form.flightPlan?.permitSupport && onChange && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onChange(current => ({
                                            ...current,
                                            flightPlan: {
                                                ...(current.flightPlan ?? defaultFlightPlan()),
                                                permitSupport: true,
                                            },
                                        }))
                                    }
                                    className="rounded-control border border-amber-400 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-50"
                                >
                                    {t('airspace.advisor.enablePermitSupport')}
                                </button>
                            )}
                        </div>

                        {data.violations.length > 0 && (
                            <div className="grid gap-2">
                                <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-slate-600">
                                    {t('airspace.advisor.intersectingZones', {count: data.violations.length})}
                                </h3>
                                <ul className="m-0 grid list-none gap-2 p-0">
                                    {data.violations.map(violation => (
                                        <li
                                            key={violation.zoneId}
                                            className="grid gap-1.5 rounded-panel border border-border bg-slate-50/70 px-3.5 py-3 text-xs"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="text-sm font-bold text-foreground">
                                                    <span className="font-mono text-xs text-slate-600">{violation.code}</span>
                                                    {' · '}
                                                    {violation.name}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center rounded-badge border px-2 py-0.5 text-[11px] font-bold',
                                                        AIRSPACE_ZONE_TYPE_TONE[violation.zoneType],
                                                    )}
                                                >
                                                    {t(`airspace.zoneType.${violation.zoneType}`)}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                                                <span>
                                                    {t('airspace.advisor.authority', {authority: violation.authority})}
                                                </span>
                                                <span>
                                                    {violation.maxAltitudeAglM != null
                                                        ? t('airspace.advisor.ceilingLimit', {
                                                              meters: formatNumber(violation.maxAltitudeAglM),
                                                          })
                                                        : t('airspace.advisor.ceilingUnlimited')}
                                                </span>
                                                <span>
                                                    {violation.distanceMeters <= 0
                                                        ? t('airspace.advisor.insideZone')
                                                        : t('airspace.advisor.distance', {
                                                              meters: formatNumber(Math.round(violation.distanceMeters)),
                                                          })}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className="m-0 text-xs leading-relaxed text-muted">{t('airspace.advisor.disclaimer')}</p>
                    </>
                )}
            </div>
        </section>
    );
}
