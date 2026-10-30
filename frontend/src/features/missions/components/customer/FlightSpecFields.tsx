'use client';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import {OptionalMark} from '@/components/shared/RequiredMark';
import {flightAltitudes, flightGsdOptions, flightSensors, type FlightPlanInput, type FlightSensor} from '@/features/missions/types/flight-plan.types';

/** Professional flight parameters stored with the plan: altitude, GSD, image overlap, payload and site safety. */
export function FlightSpecFields({plan, onChange}: { plan: FlightPlanInput; onChange: (plan: FlightPlanInput) => void }) {
    const {t} = useI18n();
    const set = <K extends keyof FlightPlanInput>(key: K, value: FlightPlanInput[K]) => onChange({...plan, [key]: value});
    const toggleSensor = (sensor: FlightSensor) => set('sensors', plan.sensors.includes(sensor)
        ? plan.sensors.filter(s => s !== sensor) : [...plan.sensors, sensor]);
    const label = 'grid gap-1.5 text-xs font-bold text-foreground';
    const input = 'min-h-11 w-full border border-border-input bg-card px-3 py-2 text-base font-normal text-foreground sm:text-sm';

    return <fieldset className="col-span-full grid gap-4 border border-border p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-extrabold text-foreground">{t('flightSpec.title')}</legend>
        <div className={label}><span>{t('flightSpec.altitude')}</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('flightSpec.altitude')}>
                {flightAltitudes.map(a => <button key={a} type="button" role="radio" aria-checked={plan.altitudeAglMeters === a}
                                                  onClick={() => set('altitudeAglMeters', a)}
                                                  className={cn('h-9 min-w-14 border px-3 text-sm font-semibold tabular-nums',
                                                      plan.altitudeAglMeters === a ? 'border-primary bg-primary text-primary-foreground' : 'border-border-input bg-card text-slate-700 hover:bg-slate-50')}>
                    {a} m</button>)}
            </div>
            <span className="text-xs font-normal text-muted">{t('flightSpec.altitudeHint')}</span>
        </div>
        <label className={label}><span>{t('flightSpec.gsd')}</span>
            <select className={input} value={plan.targetGsdCm} onChange={e => set('targetGsdCm', Number(e.target.value))}>
                {flightGsdOptions.map(g => <option key={g} value={g}>{t(`flightSpec.gsdOption.${g.toFixed(1).replace('.', '_')}`)}</option>)}
            </select></label>
        <label className={label}><span>{t('flightSpec.forwardOverlap')}</span>
            <span className="flex items-center gap-3"><input type="range" min={60} max={90} step={5} value={plan.forwardOverlap}
                                                             onChange={e => set('forwardOverlap', Number(e.target.value))} className="flex-1 accent-primary"/>
                <strong className="w-12 text-right tabular-nums">{plan.forwardOverlap}%</strong></span></label>
        <label className={label}><span>{t('flightSpec.sideOverlap')}</span>
            <span className="flex items-center gap-3"><input type="range" min={50} max={85} step={5} value={plan.sideOverlap}
                                                             onChange={e => set('sideOverlap', Number(e.target.value))} className="flex-1 accent-primary"/>
                <strong className="w-12 text-right tabular-nums">{plan.sideOverlap}%</strong></span></label>
        <fieldset className="col-span-full grid gap-2">
            <legend className="mb-1.5 text-xs font-bold text-foreground">{t('flightSpec.sensors')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
                {flightSensors.map(sensor => <label key={sensor}
                                                    className={cn('flex cursor-pointer items-start gap-2.5 border p-3 text-sm',
                                                        plan.sensors.includes(sensor) ? 'border-primary bg-uav-red-light' : 'border-border-input bg-card')}>
                    <input type="checkbox" className="mt-0.5 accent-primary" checked={plan.sensors.includes(sensor)} onChange={() => toggleSensor(sensor)}/>
                    <span><strong className="block text-foreground">{t(`flightSpec.sensor.${sensor}.name`)}</strong>
                        <span className="text-xs text-muted">{t(`flightSpec.sensor.${sensor}.detail`)}</span></span>
                </label>)}
            </div>
        </fieldset>
        <label className={cn(label, 'col-span-full')}><span>{t('flightSpec.obstacles')}<OptionalMark/></span>
            <textarea className={cn(input, 'min-h-24 resize-y')} rows={3} value={plan.obstacles ?? ''}
                      placeholder={t('flightSpec.obstaclesPlaceholder')} onChange={e => set('obstacles', e.target.value)}/></label>
        <label className="col-span-full flex items-start gap-2.5 border border-border-input bg-card p-3 text-sm">
            <input type="checkbox" className="mt-0.5 accent-primary" checked={plan.permitSupport} onChange={e => set('permitSupport', e.target.checked)}/>
            <span><strong className="block text-foreground">{t('flightSpec.permit')}</strong>
                <span className="text-xs text-muted">{t('flightSpec.permitDetail')}</span></span>
        </label>
    </fieldset>;
}
