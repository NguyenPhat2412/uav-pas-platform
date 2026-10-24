'use client';
import Link from 'next/link';
import {planName} from "@/components/shared/presentation";
import {PageGuard} from "@/components/customer/layout";
import {Panel, Status} from "@/components/customer/ui";
import {useAuth} from '@/contexts/AuthContext';
import {useBilling, useMissions, useServices} from "@/lib/query/customer";
import {Activity, Boxes, Plane} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';

export default function DashboardPage() {
    return <PageGuard><Dashboard/></PageGuard>;
}

function Dashboard() {
    const {user} = useAuth();
    const {t, formatDate} = useI18n();
    const shortDate = (value?: string) => {
        if (!value) return '—';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '—' : formatDate(date, {dateStyle: 'short'});
    };
    const missions = useMissions();
    const services = useServices();
    const {quota} = useBilling();
    const realRows = missions.data?.content ?? [];
    const rows = realRows;
    const totalMissions = missions.data?.totalElements ?? 0;
    const inProgressMissions = rows.filter(m => ['PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS'].includes(m.status)).length;
    const openServices = services.data?.length ?? 0;

    return (
        <>
            {(missions.isError || services.isError) &&
                <div role="alert" className="notice error">{t('dashboard.loadError')}</div>}
            <div className="page-heading">
                <div>
                    <h1 style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        <span style={{
                            width: 8,
                            height: 26,
                            background: '#ab2523',
                            borderRadius: 9999,
                            display: 'inline-block'
                        }}/>
                        {t('dashboard.greeting', {name: user?.fullName || user?.username || t('dashboard.defaultName')})}
                    </h1>
                    <p>{t('dashboard.subtitle')}</p>
                </div>
                <Link href="/customer/missions/create" className="button button-primary">{t('dashboard.bookService')}</Link>
            </div>

            {/* Frame 1: KPI Grid */}
            <div className="grid grid-3">
                <Panel style={{borderLeft: '4px solid #ab2523'}}>
                    <div style={{display: 'flex', alignItems: 'flex-start', gap: 12}}>
            <span style={{
                display: 'flex',
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: '#fdf2f2',
                color: '#ab2523',
                flexShrink: 0
            }}>
              <Activity size={18}/>
            </span>
                        <div>
                            <span className="muted" style={{display: 'block', fontWeight: 600, fontSize: 13}}>{t('dashboard.totalMissions')}</span>
                            <div className="metric" style={{marginTop: 8, color: '#0f172a'}}>{totalMissions}</div>
                            <small style={{
                                display: 'block',
                                marginTop: 8,
                                color: '#64748b',
                                fontSize: 12,
                                fontWeight: 500
                            }}>{t('dashboard.totalMissionsHint')}</small>
                        </div>
                    </div>
                </Panel>

                <Panel style={{borderLeft: '4px solid #007f3e'}}>
                    <div style={{display: 'flex', alignItems: 'flex-start', gap: 12}}>
            <span style={{
                display: 'flex',
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: '#ecfdf5',
                color: '#007f3e',
                flexShrink: 0
            }}>
              <Plane size={18}/>
            </span>
                        <div>
                            <span className="muted" style={{display: 'block', fontWeight: 600, fontSize: 13}}>{t('dashboard.inProgress')}</span>
                            <div className="metric" style={{marginTop: 8, color: '#007f3e'}}>{inProgressMissions}</div>
                            <small style={{
                                display: 'block',
                                marginTop: 8,
                                color: '#007f3e',
                                fontSize: 12,
                                fontWeight: 500
                            }}>{t('dashboard.inProgressHint')}</small>
                        </div>
                    </div>
                </Panel>

                <Panel style={{borderLeft: '4px solid #d97706'}}>
                    <div style={{display: 'flex', alignItems: 'flex-start', gap: 12}}>
            <span style={{
                display: 'flex',
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: '#fffbeb',
                color: '#d97706',
                flexShrink: 0
            }}>
              <Boxes size={18}/>
            </span>
                        <div>
                            <span className="muted" style={{display: 'block', fontWeight: 600, fontSize: 13}}>{t('dashboard.openServices')}</span>
                            <div className="metric" style={{marginTop: 8, color: '#0f172a'}}>{openServices}</div>
                            <small style={{
                                display: 'block',
                                marginTop: 8,
                                color: '#64748b',
                                fontSize: 12,
                                fontWeight: 500
                            }}>{t('dashboard.openServicesHint')}</small>
                        </div>
                    </div>
                </Panel>
            </div>

            {/* Frame 2 & 3: Mission Stream & Quota Status */}
            <div className="grid grid-2" style={{marginTop: 20}}>
                {/* Frame 2: Mission Table */}
                <Panel
                    title={t('dashboard.recentMissions')}
                    action={<Link href="/customer/missions" className="button-link" style={{
                        fontSize: 12,
                        color: '#ab2523',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                    }}>{t('dashboard.viewAll')}</Link>}
                    style={{height: '100%'}}
                >
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>{t('dashboard.missionCode')}</th>
                                <th>{t('dashboard.time')}</th>
                                <th style={{textAlign: 'right'}}>{t('common.status')}</th>
                            </tr>
                            </thead>
                            <tbody>
                            {!rows.length && <tr>
                                <td colSpan={3}>{missions.isPending ? t('dashboard.loadingMissions') : t('dashboard.noMissions')}</td>
                            </tr>}
                            {rows.slice(0, 5).map(m => (
                                <tr key={m.id}>
                                    <td>
                                        <Link className="button-link" href={`/customer/missions/${m.id}`}
                                              style={{fontWeight: 700, color: '#0f172a', fontFamily: 'monospace'}}>
                                            {m.code}
                                        </Link>
                                        <div className="muted" style={{fontSize: 12, marginTop: 2}}>{m.title}</div>
                                    </td>
                                    <td style={{
                                        fontSize: 12,
                                        color: '#64748b',
                                        whiteSpace: 'nowrap',
                                        fontFamily: 'monospace'
                                    }}>
                                        {shortDate(m.startTime)}
                                    </td>
                                    <td style={{textAlign: 'right'}}>
                                        <Status value={m.status}/>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                {/* Frame 3: Quota & Quick Shortcuts */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 18,
                    height: '100%'
                }}>
                    <Panel title={t('dashboard.quotaTitle')}>
                        {quota.isPending ? <p>{t('dashboard.loadingQuota')}</p> : quota.isError ?
                            <p role="status">{t('dashboard.quotaError')} <Link href="/customer/billing">{t('dashboard.viewPlans')}</Link></p> : <div className="stack">
                                <p>{t('dashboard.currentPlan')} <strong>{quota.data?.planName ? planName(quota.data.planName) : t('dashboard.noPlan')}</strong>
                                </p>
                                <p>{t('dashboard.hoursUsed')} <strong>{quota.data?.flightHoursUsed ?? 0} / {quota.data?.flightHoursLimit ?? 0}</strong>
                                </p>
                                <p>{t('dashboard.cycleEnd')} <strong>{shortDate(quota.data?.cycleEnd)}</strong>
                                </p>
                            </div>}
                    </Panel>

                    <Panel title={t('dashboard.quickStart')} style={{flex: 1}}>
                        <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                            <Link href="/customer/services" className="button button-secondary" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px'
                            }}>
                                <span>{t('dashboard.exploreServices')}</span>
                            </Link>
                            <Link href="/customer/missions/create" className="button button-secondary" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px'
                            }}>
                                <span>{t('dashboard.createRequest')}</span>
                            </Link>
                            <Link href="/customer/billing" className="button button-secondary" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px'
                            }}>
                                <span>{t('dashboard.manageBilling')}</span>
                            </Link>
                        </div>
                    </Panel>
                </div>
            </div>
        </>
    );
}
