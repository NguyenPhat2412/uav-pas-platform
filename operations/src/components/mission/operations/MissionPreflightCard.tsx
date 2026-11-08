'use client';

import {useState} from 'react';
import {CheckCircle2, ClipboardCheck} from 'lucide-react';
import {Alert, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Textarea} from '@/components/ui';
import {useMissionMutations, useMissionPreflight} from '@/hooks/mission/useOperationsMissions';
import {formatDate} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {Mission} from '@/types/mission/mission.types';

const EDITABLE_STATUSES = new Set(['CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS']);

interface PreflightOverrides {
    missionId?: number;
    airframe?: boolean;
    battery?: boolean;
    gnss?: boolean;
    weatherOk?: boolean;
    airspaceOk?: boolean;
    batteryPct?: string;
    satellites?: string;
    windMs?: string;
    notes?: string;
}

export function MissionPreflightCard({
    mission,
    canSign,
    disabled,
    onSigned,
}: {
    mission: Mission;
    canSign: boolean;
    disabled?: boolean;
    onSigned?: () => void;
}) {
    const {t} = useI18n();
    const visible = !['DRAFT', 'PENDING_CONFIRMATION', 'CANCELLED', 'REJECTED'].includes(mission.status);
    const query = useMissionPreflight(mission.id, visible);
    const {upsertPreflight} = useMissionMutations();

    const [overrides, setOverrides] = useState<PreflightOverrides>({});
    const [feedback, setFeedback] = useState<{missionId: number; tone: 'info' | 'error'; text: string} | null>(null);

    const activeOverrides = overrides.missionId === mission.id ? overrides : {};
    const activeFeedback = feedback?.missionId === mission.id ? feedback : null;
    const patchOverrides = (patch: Partial<PreflightOverrides>) =>
        setOverrides(prev => ({
            ...(prev.missionId === mission.id ? prev : {missionId: mission.id}),
            missionId: mission.id,
            ...patch,
        }));

    const data = query.data;
    const airframe = activeOverrides.airframe ?? (data?.recorded ? data.airframeAndPropellersSafe : false);
    const battery = activeOverrides.battery ?? (data?.recorded ? data.batteryHealthy : false);
    const gnss = activeOverrides.gnss ?? (data?.recorded ? data.gnssRtkLocked : false);
    const weatherOk = activeOverrides.weatherOk ?? (data?.recorded ? data.weatherWithinLimits : false);
    const airspaceOk = activeOverrides.airspaceOk ?? (data?.recorded ? data.airspaceAndPermitCleared : false);
    const batteryPct = activeOverrides.batteryPct ?? (data?.recorded && data.measuredBatteryPct != null ? String(data.measuredBatteryPct) : '');
    const satellites = activeOverrides.satellites ?? (data?.recorded && data.satelliteCount != null ? String(data.satelliteCount) : '');
    const windMs = activeOverrides.windMs ?? (data?.recorded && data.measuredWindMs != null ? String(data.measuredWindMs) : '');
    const notes = activeOverrides.notes ?? (data?.recorded ? (data.notes ?? '') : '');

    if (!visible) return null;

    const editable = canSign && EDITABLE_STATUSES.has(mission.status) && !disabled;
    const inputDisabled = !editable || upsertPreflight.isPending;

    const handleSave = async () => {
        setFeedback(null);
        const parsedBatt = batteryPct.trim() ? Number(batteryPct) : null;
        const parsedSats = satellites.trim() ? Number(satellites) : null;
        const parsedWind = windMs.trim() ? Number(windMs) : null;

        try {
            await upsertPreflight.mutateAsync({
                id: mission.id,
                payload: {
                    airframeAndPropellersSafe: airframe,
                    batteryHealthy: battery,
                    gnssRtkLocked: gnss,
                    weatherWithinLimits: weatherOk,
                    airspaceAndPermitCleared: airspaceOk,
                    measuredBatteryPct: parsedBatt != null && Number.isFinite(parsedBatt) ? Math.max(0, Math.min(100, Math.round(parsedBatt))) : null,
                    satelliteCount: parsedSats != null && Number.isFinite(parsedSats) ? Math.max(0, Math.min(64, Math.round(parsedSats))) : null,
                    measuredWindMs: parsedWind != null && Number.isFinite(parsedWind) ? Math.max(0, Math.min(60, parsedWind)) : null,
                    notes: notes.trim() || undefined,
                },
            });
            await query.refetch();
            onSigned?.();
            setFeedback({missionId: mission.id, tone: 'info', text: t('capabilities.preflight.savedToast')});
        } catch (err) {
            setFeedback({
                missionId: mission.id,
                tone: 'error',
                text: err instanceof Error && err.message ? err.message : t('opsMissions.detail.errors.actionUnconfirmed'),
            });
        }
    };

    const checks: Array<{key: string; label: string; checked: boolean; onChange: (v: boolean) => void}> = [
        {key: 'airframe', label: t('capabilities.preflight.checks.airframe'), checked: airframe, onChange: v => patchOverrides({airframe: v})},
        {key: 'battery', label: t('capabilities.preflight.checks.battery'), checked: battery, onChange: v => patchOverrides({battery: v})},
        {key: 'gnss', label: t('capabilities.preflight.checks.gnss'), checked: gnss, onChange: v => patchOverrides({gnss: v})},
        {key: 'weather', label: t('capabilities.preflight.checks.weather'), checked: weatherOk, onChange: v => patchOverrides({weatherOk: v})},
        {key: 'airspace', label: t('capabilities.preflight.checks.airspace'), checked: airspaceOk, onChange: v => patchOverrides({airspaceOk: v})},
    ];

    const telemetryFields = [
        {id: `preflight-battery-${mission.id}`, label: t('capabilities.preflight.batteryPct'), max: 100, step: '1', value: batteryPct, onChange: (v: string) => patchOverrides({batteryPct: v})},
        {id: `preflight-sats-${mission.id}`, label: t('capabilities.preflight.satellites'), max: 64, step: '1', value: satellites, onChange: (v: string) => patchOverrides({satellites: v})},
        {id: `preflight-wind-${mission.id}`, label: t('capabilities.preflight.windMs'), max: 60, step: '0.1', value: windMs, onChange: (v: string) => patchOverrides({windMs: v})},
    ];

    return (
        <Card className="min-w-0" id="preflight" role="region" aria-labelledby="preflight-title">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 px-5 py-4 md:px-6">
                <div className="min-w-0">
                    <CardTitle id="preflight-title" className="inline-flex items-center gap-2 text-lg font-bold text-foreground">
                        <ClipboardCheck size={18} className="text-primary" aria-hidden="true" />
                        {t('capabilities.preflight.title')}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-muted">
                        {data?.recorded && data.signedByUsername && data.signedAt
                            ? t('capabilities.preflight.signedMeta', {user: data.signedByUsername, time: formatDate(data.signedAt)})
                            : t('capabilities.preflight.subtitle')}
                    </CardDescription>
                </div>
                <Badge
                    variant="outline"
                    icon={data?.clearedForTakeoff ? <CheckCircle2 size={12} aria-hidden="true" /> : undefined}
                    className={
                        data?.clearedForTakeoff
                            ? 'border-sky-200 bg-sky-50 normal-case text-uav-blue'
                            : 'border-amber-200 bg-amber-50 normal-case text-amber-800'
                    }
                >
                    {data?.clearedForTakeoff ? t('capabilities.preflight.clearedBadge') : t('capabilities.preflight.pendingBadge')}
                </Badge>
            </CardHeader>

            <CardContent className="grid gap-4 p-5 md:p-6">
                {activeFeedback && (
                    <Alert
                        role={activeFeedback.tone === 'error' ? 'alert' : 'status'}
                        variant={activeFeedback.tone === 'error' ? 'error' : 'success'}
                        className="py-2.5 text-xs"
                    >
                        {activeFeedback.text}
                    </Alert>
                )}

                <div className="grid gap-2.5">
                    {checks.map(item => (
                        <label
                            key={item.key}
                            className="flex items-start gap-2.5 rounded-panel border border-border bg-slate-50/70 px-3.5 py-2.5 text-sm text-foreground"
                        >
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 shrink-0"
                                checked={item.checked}
                                disabled={inputDisabled}
                                onChange={e => item.onChange(e.target.checked)}
                            />
                            <span className="font-medium leading-snug">{item.label}</span>
                        </label>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {telemetryFields.map(field => (
                        <Input
                            key={field.id}
                            id={field.id}
                            type="number"
                            min={0}
                            max={field.max}
                            step={field.step}
                            optional={false}
                            label={field.label}
                            value={field.value}
                            disabled={inputDisabled}
                            onChange={e => field.onChange(e.target.value)}
                            className="h-10 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    ))}
                </div>

                <Textarea
                    id={`preflight-notes-${mission.id}`}
                    rows={2}
                    maxLength={1000}
                    optional={false}
                    label={t('capabilities.preflight.notes')}
                    value={notes}
                    disabled={inputDisabled}
                    placeholder={t('capabilities.preflight.notesPlaceholder')}
                    onChange={e => patchOverrides({notes: e.target.value})}
                />

                {editable && (
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            isLoading={upsertPreflight.isPending}
                            loadingText={t('capabilities.preflight.signing')}
                            disabled={upsertPreflight.isPending}
                            onClick={() => void handleSave()}
                        >
                            {t('capabilities.preflight.signButton')}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
