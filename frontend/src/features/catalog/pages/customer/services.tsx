'use client';
import {UavIcon} from '@/components/shared/UavIcon';
import {serviceName} from '@/components/shared/presentation';
import Link from 'next/link';
import {Camera, Clock3, Database, type LucideIcon, MapPinned} from 'lucide-react';
import {PageGuard} from '@/components/customer/layout';
import {Button, Panel} from '@/components/customer/ui';
import {useServices} from '@/lib/query/customer';
import {useAuth} from '@/contexts/AuthContext';
import styles from './services.module.css';
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
        <div className="page-heading">
            <div><h1>{t('services.title')}</h1><p>{t('services.subtitle')}</p></div>
        </div>
        {q.isLoading ? <div className="empty" role="status">{t('services.loading')}</div>
            : q.isError ?
                <div className="error" role="alert">{t('services.loadError')} <Button variant="secondary"
                                                                                            onClick={() => void q.refetch()}>{t('common.retry')}</Button></div>
                : <div className={styles.grid}>{(q.data ?? []).map(service => {
                    const Icon = serviceIcons[service.code] ?? UavIcon;
                    return <Panel key={service.id}>
                        <div className={styles.card}>
                            <span className={styles.icon}><Icon size={28} aria-hidden="true"/></span>
                            <h2>{serviceName(service)}</h2>
                            <p>{service.description || t('services.defaultDescription')}</p>
                            <div className={styles.duration}><Clock3 size={16} aria-hidden="true"/><span>{t('services.defaultDuration', {minutes: service.defaultDurationMinutes})}</span>
                            </div>
                            {can('MISSION_CREATE') && <Link href={`/customer/missions/create?serviceId=${service.id}`}
                                                            className={styles.action}>{t('services.book')}</Link>}
                        </div>
                    </Panel>;
                })}</div>}
        {q.isSuccess && !q.data.length && <div className="empty">{t('services.empty')}</div>}
    </>;
}
