'use client';
import {UavIcon} from '@/components/shared/UavIcon';
import {serviceName} from '@/components/shared/presentation';
import Link from 'next/link';
import {Camera, CheckCircle2, Clock3, Database, type LucideIcon, MapPinned, Timer} from 'lucide-react';
import {serviceDeliverables} from '@/features/catalog/service-specs';
import {PageGuard} from '@/components/customer/layout';
import {Button, Panel} from '@/components/customer/ui';
import {useServices} from '@/lib/query/customer';
import {useAuth} from '@/contexts/AuthContext';
import {toServiceSlug} from '@/lib/url-slugs';
import {useI18n} from '@/contexts/I18nContext';
import type {UavService} from '@/features/missions/types/mission.types';

const serviceIcons: Record<string, LucideIcon | typeof UavIcon> = {
    UAV_RENTAL: UavIcon, AREA_INSPECTION: MapPinned, AERIAL_RECORDING: Camera, DATA_COLLECTION: Database,
};

export default function ServicesPage() {
    return <PageGuard><Services/></PageGuard>;
}

function Services() {
    const q = useServices();
    const {can} = useAuth();
    const {t, formatNumber} = useI18n();
    const hours = (value?: number | null) => value == null ? t('services.sla.contact') : t('services.sla.hours', {value: formatNumber(value)});
    const services = q.data ?? [];
    return <>
        {q.isLoading ? (
            <div className="p-8 text-center text-slate-500" role="status">{t('services.loading')}</div>
        ) : q.isError ? (
            <div className="px-3.5 py-3 rounded-none bg-rose-50 text-danger text-[13px] flex items-center justify-between gap-3 flex-wrap" role="alert">
                <span>{t('services.loadError')}</span>
                <Button variant="secondary" onClick={() => void q.refetch()}>{t('common.retry')}</Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-px border border-slate-200 bg-slate-200 md:grid-cols-2 md:[&>*:last-child:nth-child(odd)]:col-span-full [&>*]:border-0">
                {(q.data ?? []).map(service => {
                    const Icon = serviceIcons[service.code] ?? UavIcon;
                    return (
                        <Panel key={service.id}>
                            <div className="flex flex-col h-full gap-4">
                                <span className="inline-flex items-center justify-center w-[52px] h-[52px] rounded-none text-primary bg-primary/10">
                                    <Icon size={28} aria-hidden="true"/>
                                </span>
                                <h2 className="m-0 text-card-foreground text-xl leading-snug font-bold">
                                    {serviceName(service)}
                                </h2>
                                <p className="m-0 text-slate-600 text-sm leading-relaxed">
                                    {service.description || t('services.defaultDescription')}
                                </p>
                                {!!serviceDeliverables[service.code]?.length && <div className="grid gap-2">
                                    <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">{t('services.deliverablesTitle')}</h3>
                                    <ul className="m-0 grid list-none gap-1.5 p-0">{serviceDeliverables[service.code].map(item =>
                                        <li key={item} className="flex items-start gap-2 text-[13px] text-slate-700">
                                            <CheckCircle2 size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-primary"/>
                                            <span>{t(`services.deliverables.${item}`)}</span>
                                        </li>)}</ul>
                                </div>}
                                <dl className="m-0 mt-auto grid gap-2 border-t border-border pt-3 text-[13px] text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Clock3 size={16} aria-hidden="true" className="shrink-0"/>
                                        <dt className="sr-only">{t('services.sla.duration')}</dt>
                                        <dd className="m-0">{t('services.defaultDuration', {minutes: service.defaultDurationMinutes})}</dd>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Timer size={16} aria-hidden="true" className="shrink-0"/>
                                        <dt>{t('services.sla.onSite')}</dt>
                                        <dd className="m-0 font-semibold text-slate-800">{hours(service.onSiteHours)}</dd>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Timer size={16} aria-hidden="true" className="shrink-0"/>
                                        <dt>{t('services.sla.delivery')}</dt>
                                        <dd className="m-0 font-semibold text-slate-800">{hours(service.deliveryHours)}</dd>
                                    </div>
                                </dl>
                                {can('MISSION_CREATE') && (
                                    <Link
                                        href={`/customer/missions/create?service=${toServiceSlug(service)}`}
                                        className="inline-flex justify-between items-center gap-3 text-primary hover:text-primary-hover text-sm font-bold min-h-[44px] border-t border-border pt-3.5 transition-colors"
                                    >
                                        {t('services.book')}
                                    </Link>
                                )}
                            </div>
                        </Panel>
                    );
                })}
            </div>
        )}
        {q.isSuccess && services.length > 0 && <SpecTable services={services}/>}
        {q.isSuccess && !q.data.length && (
            <div className="p-8 text-center text-slate-500">{t('services.empty')}</div>
        )}
    </>;
}

/** Side-by-side technical sheet. Every value comes from the service record; blanks mean "ask dispatch", never a guess. */
function SpecTable({services}: { services: UavService[] }) {
    const {t, formatNumber} = useI18n();
    const none = t('services.spec.contact');
    const rows: { key: string; label: string; value: (s: UavService) => React.ReactNode }[] = [
        {key: 'sensors', label: t('services.spec.sensors'), value: s => s.sensors?.length
                ? <ul className="m-0 flex list-none flex-wrap gap-1 p-0">{s.sensors.map(code =>
                    <li key={code} className="rounded-none bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{t(`flightSpec.sensor.${code}.name`)}</li>)}</ul>
                : none},
        {key: 'gsd', label: t('services.spec.gsd'), value: s => s.bestGsdCm != null ? t('services.spec.gsdValue', {value: formatNumber(s.bestGsdCm)}) : none},
        {key: 'area', label: t('services.spec.area'), value: s => s.maxAreaHectares != null ? t('services.spec.areaValue', {value: formatNumber(s.maxAreaHectares)}) : none},
        {key: 'wind', label: t('services.spec.wind'), value: s => s.maxWindMs != null ? t('services.spec.windValue', {value: formatNumber(s.maxWindMs)}) : none},
        {key: 'duration', label: t('services.spec.duration'), value: s => t('services.defaultDuration', {minutes: s.defaultDurationMinutes})},
        {key: 'onSite', label: t('services.sla.onSite'), value: s => s.onSiteHours != null ? t('services.sla.hours', {value: formatNumber(s.onSiteHours)}) : none},
        {key: 'delivery', label: t('services.sla.delivery'), value: s => s.deliveryHours != null ? t('services.sla.hours', {value: formatNumber(s.deliveryHours)}) : none},
        {key: 'deliverables', label: t('services.deliverablesTitle'), value: s => serviceDeliverables[s.code]?.length
                ? serviceDeliverables[s.code].map(item => t(`services.deliverables.${item}`)).join(', ') : none},
    ];
    return <section aria-labelledby="service-spec-title" className="mt-8 overflow-hidden rounded-none border border-border bg-card">
        <header className="border-b border-border px-5 py-4">
            <h2 id="service-spec-title" className="m-0 text-lg font-bold text-card-foreground">{t('services.spec.title')}</h2>
            <p className="m-0 mt-1 text-[13px] text-slate-500">{t('services.spec.subtitle')}</p>
        </header>
        <div className="overflow-x-auto" tabIndex={0} aria-label={t('services.spec.title')}>
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                <tr className="bg-slate-50">
                    <th scope="col" className="sticky left-0 z-10 w-44 border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('services.spec.criteria')}</th>
                    {services.map(s => <th key={s.id} scope="col" className="border-b border-border px-4 py-3 text-left font-bold text-slate-900">{serviceName(s)}</th>)}
                </tr>
                </thead>
                <tbody className="divide-y divide-border">
                {rows.map(row => <tr key={row.key}>
                    <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-semibold text-slate-600">{row.label}</th>
                    {services.map(s => {
                        const value = row.value(s);
                        return <td key={s.id} className={`px-4 py-3 align-top ${value === none ? 'text-slate-400' : 'text-slate-800'}`}>{value}</td>;
                    })}
                </tr>)}
                </tbody>
            </table>
        </div>
    </section>;
}
