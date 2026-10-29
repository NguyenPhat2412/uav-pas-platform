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
    return <div className="flex flex-1 flex-col bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 sm:px-5">
            <span className="text-xs font-semibold tabular-nums text-slate-500">{t('services.count', {count: services.length})}</span>
            {can('MISSION_CREATE') && (
                <Link
                    href="/customer/missions/create"
                    className="inline-flex min-h-9 items-center justify-center rounded-control bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover"
                >
                    {t('dashboard.createRequest')}
                </Link>
            )}
        </div>
        {q.isLoading ? (
            <div className="p-8 text-center text-slate-500" role="status">{t('services.loading')}</div>
        ) : q.isError ? (
            <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-danger flex items-center justify-between gap-3 flex-wrap" role="alert">
                <span>{t('services.loadError')}</span>
                <Button variant="secondary" onClick={() => void q.refetch()}>{t('common.retry')}</Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-2 md:[&>*:last-child:nth-child(odd)]:col-span-full [&>*]:border-0">
                {(q.data ?? []).map(service => {
                    const Icon = serviceIcons[service.code] ?? UavIcon;
                    return (
                        <Panel key={service.id} className="h-full">
                            <div className="flex flex-col h-full gap-3.5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-panel text-primary bg-uav-red-light">
                                            <Icon size={22} aria-hidden="true"/>
                                        </span>
                                        <div>
                                            <span className="block font-mono text-[10.5px] font-bold text-slate-400">{service.code}</span>
                                            <h2 className="m-0 text-card-foreground text-lg leading-snug font-extrabold">
                                                {serviceName(service)}
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                                <p className="m-0 text-slate-600 text-[13.5px] leading-relaxed">
                                    {service.description || t('services.defaultDescription')}
                                </p>
                                {!!serviceDeliverables[service.code]?.length && <div className="grid gap-1.5">
                                    <h3 className="m-0 text-[11px] font-bold text-slate-500">{t('services.deliverablesTitle')}</h3>
                                    <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2">{serviceDeliverables[service.code].map(item =>
                                        <li key={item} className="flex items-start gap-2 text-xs text-slate-700">
                                            <CheckCircle2 size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-primary"/>
                                            <span>{t(`services.deliverables.${item}`)}</span>
                                        </li>)}</ul>
                                </div>}
                                <dl className="m-0 mt-auto grid grid-cols-3 gap-px border border-slate-200 bg-slate-200 text-xs">
                                    <div className="flex flex-col gap-0.5 bg-slate-50/70 px-3 py-2">
                                        <dt className="flex items-center gap-1 text-[11px] text-slate-500">
                                            <Clock3 size={12} aria-hidden="true" className="shrink-0"/>
                                            <span>{t('services.sla.duration')}</span>
                                        </dt>
                                        <dd className="m-0 font-bold text-slate-800">{t('services.defaultDuration', {minutes: service.defaultDurationMinutes})}</dd>
                                    </div>
                                    <div className="flex flex-col gap-0.5 bg-slate-50/70 px-3 py-2">
                                        <dt className="flex items-center gap-1 text-[11px] text-slate-500">
                                            <Timer size={12} aria-hidden="true" className="shrink-0"/>
                                            <span>{t('services.sla.onSite')}</span>
                                        </dt>
                                        <dd className="m-0 font-bold text-slate-800">{hours(service.onSiteHours)}</dd>
                                    </div>
                                    <div className="flex flex-col gap-0.5 bg-slate-50/70 px-3 py-2">
                                        <dt className="flex items-center gap-1 text-[11px] text-slate-500">
                                            <Timer size={12} aria-hidden="true" className="shrink-0"/>
                                            <span>{t('services.sla.delivery')}</span>
                                        </dt>
                                        <dd className="m-0 font-bold text-slate-800">{hours(service.deliveryHours)}</dd>
                                    </div>
                                </dl>
                                {can('MISSION_CREATE') && (
                                    <Link
                                        href={`/customer/missions/create?service=${toServiceSlug(service)}`}
                                        className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
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
    </div>;
}

/** Side-by-side technical sheet. Every value comes from the service record; blanks mean "ask dispatch", never a guess. */
function SpecTable({services}: { services: UavService[] }) {
    const {t, formatNumber} = useI18n();
    const none = t('services.spec.contact');
    const rows: { key: string; label: string; value: (s: UavService) => React.ReactNode }[] = [
        {key: 'sensors', label: t('services.spec.sensors'), value: s => s.sensors?.length
                ? <ul className="m-0 flex list-none flex-wrap gap-1 p-0">{s.sensors.map(code =>
                    <li key={code} className="rounded-panel bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{t(`flightSpec.sensor.${code}.name`)}</li>)}</ul>
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
    return <section aria-labelledby="service-spec-title" className="overflow-hidden border-b border-slate-200 bg-white">
        <header className="border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
            <h2 id="service-spec-title" className="m-0 text-sm font-bold text-slate-800">{t('services.spec.title')}</h2>
            <p className="m-0 mt-1 text-[13px] text-slate-500">{t('services.spec.subtitle')}</p>
        </header>
        <div className="overflow-x-auto" tabIndex={0} aria-label={t('services.spec.title')}>
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                <tr className="bg-slate-50">
                    <th scope="col" className="sticky left-0 z-10 w-44 border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500">
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
