'use client';

import {useState} from 'react';
import {Button, Card, FormField, Input, Select, Textarea} from '@/components/ui';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';
import {
    flightAltitudes,
    flightGsdOptions,
    flightSensors,
    type FlightPlanInput,
    type FlightSensor,
} from '@/types/mission/flight-plan.types';

/** Professional flight parameters stored with the plan: altitude, GSD, image overlap, payload and site safety. */
export function FlightSpecFields({plan, onChange}: { plan: FlightPlanInput; onChange: (plan: FlightPlanInput) => void }) {
    const {t} = useI18n();
    const set = <K extends keyof FlightPlanInput>(key: K, value: FlightPlanInput[K]) => onChange({...plan, [key]: value});
    const [prevAlt, setPrevAlt] = useState(plan.altitudeAglMeters);
    const [altInput, setAltInput] = useState(String(plan.altitudeAglMeters));
    if (prevAlt !== plan.altitudeAglMeters) {
        setPrevAlt(plan.altitudeAglMeters);
        if (altInput.trim() === '' || Number(altInput) !== plan.altitudeAglMeters) {
            setAltInput(String(plan.altitudeAglMeters));
        }
    }
    const toggleSensor = (sensor: FlightSensor) =>
        set('sensors', plan.sensors.includes(sensor) ? plan.sensors.filter(s => s !== sensor) : [...plan.sensors, sensor]);
    const labelClass = 'font-bold text-foreground';

    return (
        <Card className="col-span-full border-border p-4">
            <fieldset className="m-0 grid gap-4 border-0 p-0 sm:grid-cols-2">
                <legend className="mb-1 px-0 text-sm font-extrabold text-foreground">{t('flightSpec.title')}</legend>
                <FormField
                    label={t('flightSpec.altitude')}
                    optional={false}
                    helperText={t('flightSpec.altitudeHint')}
                    labelClassName={labelClass}
                >
                    <div className="flex flex-wrap items-center gap-1.5">
                        <div
                            className="flex flex-wrap gap-1.5"
                            role="radiogroup"
                            aria-label={t('flightSpec.altitude')}
                            onKeyDown={e => {
                                const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
                                if (!step) return;
                                const currentIndex = flightAltitudes.indexOf(plan.altitudeAglMeters as (typeof flightAltitudes)[number]);
                                const baseIndex = currentIndex >= 0 ? currentIndex : 0;
                                const nextIndex = (baseIndex + step + flightAltitudes.length) % flightAltitudes.length;
                                const nextAlt = flightAltitudes[nextIndex];
                                e.preventDefault();
                                set('altitudeAglMeters', nextAlt);
                                const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="radio"]');
                                buttons[nextIndex]?.focus();
                            }}
                        >
                            {flightAltitudes.map((a, idx) => {
                                const checked = plan.altitudeAglMeters === a;
                                const hasPresetMatch = flightAltitudes.includes(plan.altitudeAglMeters as (typeof flightAltitudes)[number]);
                                return (
                                    <Button
                                        key={a}
                                        type="button"
                                        role="radio"
                                        aria-checked={checked}
                                        tabIndex={checked || (!hasPresetMatch && idx === 0) ? 0 : -1}
                                        variant={checked ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => set('altitudeAglMeters', a)}
                                        className={cn(
                                            'min-w-14 tabular-nums',
                                            !checked && 'border-border-input bg-card text-slate-700 hover:bg-slate-50',
                                        )}
                                    >
                                        {a} m
                                    </Button>
                                );
                            })}
                        </div>
                        <div className="inline-flex items-center gap-1.5">
                            <div className="w-24">
                                <Input
                                    type="number"
                                    min={10}
                                    max={500}
                                    step={5}
                                    aria-label={t('flightSpec.customAltitude')}
                                    value={altInput}
                                    onChange={e => {
                                        const raw = e.target.value;
                                        setAltInput(raw);
                                        if (raw.trim() === '') return;
                                        const parsed = Number(raw);
                                        if (Number.isFinite(parsed) && parsed >= 10 && parsed <= 500) {
                                            set('altitudeAglMeters', Math.round(parsed));
                                        }
                                    }}
                                    onBlur={() => {
                                        const parsed = Number(altInput);
                                        if (!Number.isFinite(parsed) || altInput.trim() === '') {
                                            setAltInput(String(plan.altitudeAglMeters));
                                            return;
                                        }
                                        const clamped = Math.max(10, Math.min(500, Math.round(parsed)));
                                        setAltInput(String(clamped));
                                        if (clamped !== plan.altitudeAglMeters) {
                                            set('altitudeAglMeters', clamped);
                                        }
                                    }}
                                    className="h-9 px-2.5 text-sm font-semibold tabular-nums"
                                />
                            </div>
                            <span className="text-xs font-semibold text-slate-500" aria-hidden="true">m</span>
                        </div>
                    </div>
                </FormField>
                <FormField id="flight-spec-gsd" label={t('flightSpec.gsd')} optional={false} labelClassName={labelClass}>
                    <Select
                        id="flight-spec-gsd"
                        value={plan.targetGsdCm}
                        onChange={e => set('targetGsdCm', Number(e.target.value))}
                    >
                        {flightGsdOptions.map(g => (
                            <option key={g} value={g}>
                                {t(`flightSpec.gsdOption.${g.toFixed(1).replace('.', '_')}`)}
                            </option>
                        ))}
                    </Select>
                </FormField>
                <FormField id="flight-spec-forward-overlap" label={t('flightSpec.forwardOverlap')} optional={false} labelClassName={labelClass}>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <Input
                                id="flight-spec-forward-overlap"
                                type="range"
                                min={60}
                                max={90}
                                step={5}
                                value={plan.forwardOverlap}
                                onChange={e => set('forwardOverlap', Number(e.target.value))}
                                className="h-2 border-0 bg-transparent px-0 accent-primary focus:outline-none"
                            />
                        </div>
                        <strong className="w-12 text-right text-xs tabular-nums">{plan.forwardOverlap}%</strong>
                    </div>
                </FormField>
                <FormField id="flight-spec-side-overlap" label={t('flightSpec.sideOverlap')} optional={false} labelClassName={labelClass}>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <Input
                                id="flight-spec-side-overlap"
                                type="range"
                                min={50}
                                max={85}
                                step={5}
                                value={plan.sideOverlap}
                                onChange={e => set('sideOverlap', Number(e.target.value))}
                                className="h-2 border-0 bg-transparent px-0 accent-primary focus:outline-none"
                            />
                        </div>
                        <strong className="w-12 text-right text-xs tabular-nums">{plan.sideOverlap}%</strong>
                    </div>
                </FormField>
                <fieldset className="col-span-full m-0 grid gap-2 border-0 p-0">
                    <legend className="mb-1.5 text-xs font-bold text-foreground">{t('flightSpec.sensors')}</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {flightSensors.map(sensor => {
                            const selected = plan.sensors.includes(sensor);
                            return (
                                <label
                                    key={sensor}
                                    className={cn(
                                        'flex cursor-pointer items-start gap-2.5 rounded-control border p-3 text-sm transition-colors',
                                        selected ? 'border-primary bg-uav-red-light' : 'border-border-input bg-card',
                                    )}
                                >
                                    <span className="mt-0.5 w-4 shrink-0">
                                        <Input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => toggleSensor(sensor)}
                                            className="h-4 w-4 border-border-input p-0 accent-primary"
                                        />
                                    </span>
                                    <span>
                                        <strong className="block text-foreground">{t(`flightSpec.sensor.${sensor}.name`)}</strong>
                                        <span className="text-xs text-muted">{t(`flightSpec.sensor.${sensor}.detail`)}</span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </fieldset>
                <FormField
                    id="flight-spec-obstacles"
                    label={t('flightSpec.obstacles')}
                    optional
                    className="col-span-full"
                    labelClassName={labelClass}
                >
                    <Textarea
                        id="flight-spec-obstacles"
                        className="min-h-24 resize-y"
                        rows={3}
                        value={plan.obstacles ?? ''}
                        placeholder={t('flightSpec.obstaclesPlaceholder')}
                        onChange={e => set('obstacles', e.target.value)}
                    />
                </FormField>
                <label className="col-span-full flex cursor-pointer items-start gap-2.5 rounded-control border border-border-input bg-card p-3 text-sm">
                    <span className="mt-0.5 w-4 shrink-0">
                        <Input
                            type="checkbox"
                            checked={plan.permitSupport}
                            onChange={e => set('permitSupport', e.target.checked)}
                            className="h-4 w-4 border-border-input p-0 accent-primary"
                        />
                    </span>
                    <span>
                        <strong className="block text-foreground">{t('flightSpec.permit')}</strong>
                        <span className="text-xs text-muted">{t('flightSpec.permitDetail')}</span>
                    </span>
                </label>
            </fieldset>
        </Card>
    );
}
