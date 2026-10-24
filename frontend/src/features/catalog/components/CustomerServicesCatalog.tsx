'use client';
import {UavIcon} from '@/components/shared/UavIcon';
import {serviceName} from '@/components/shared/presentation';
import Link from 'next/link';
import {Camera, Clock3, Database, type LucideIcon, MapPinned} from 'lucide-react';
import {PageGuard} from '@/components/customer/layout';
import {Button, Panel} from '@/components/customer/ui';
import {useServices} from '@/lib/query/customer';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';

const serviceIcons: Record<string, LucideIcon | typeof UavIcon> = {
    UAV_RENTAL: UavIcon, AREA_INSPECTION: MapPinned, AERIAL_RECORDING: Camera, DATA_COLLECTION: Database,
};

export default function ServicesPage() {
    return <PageGuard><Services/></PageGuard>;
}

function Services() {
    const q = useServices();
    const {can} = useAuth();
    const {t} = useI18n();
    return <>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
                <h1 className="m-0 text-[25px] sm:text-[28px] leading-tight font-bold tracking-tight text-slate-900">
                    {t('services.title')}
                </h1>
                <p className="mt-1.5 mb-0 text-[13px] text-slate-500">{t('services.subtitle')}</p>
            </div>
        </div>
        {q.isLoading ? (
            <div className="p-8 text-center text-slate-500" role="status">{t('services.loading')}</div>
        ) : q.isError ? (
            <div className="px-3.5 py-3 rounded-lg bg-rose-50 text-danger text-[13px] flex items-center justify-between gap-3 flex-wrap" role="alert">
                <span>{t('services.loadError')}</span>
                <Button variant="secondary" onClick={() => void q.refetch()}>{t('common.retry')}</Button>
            </div>
        ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-6">
                {(q.data ?? []).map(service => {
                    const Icon = serviceIcons[service.code] ?? UavIcon;
                    return (
                        <Panel key={service.id}>
                            <div className="flex flex-col h-full gap-4">
                                <span className="inline-flex items-center justify-center w-[52px] h-[52px] rounded-[15px] text-primary bg-primary/10">
                                    <Icon size={28} aria-hidden="true"/>
                                </span>
                                <h2 className="m-0 text-card-foreground text-xl leading-snug font-bold">
                                    {serviceName(service)}
                                </h2>
                                <p className="m-0 text-slate-600 text-sm leading-relaxed">
                                    {service.description || t('services.defaultDescription')}
                                </p>
                                <div className="flex items-center gap-2 text-slate-600 text-[13px] mt-auto pt-2">
                                    <Clock3 size={16} aria-hidden="true" className="shrink-0"/>
                                    <span>{t('services.defaultDuration', {minutes: service.defaultDurationMinutes})}</span>
                                </div>
                                {can('MISSION_CREATE') && (
                                    <Link
                                        href={`/customer/missions/create?serviceId=${service.id}`}
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
        {q.isSuccess && !q.data.length && (
            <div className="p-8 text-center text-slate-500">{t('services.empty')}</div>
        )}
    </>;
}
