'use client';
import Link from 'next/link';
import {PageGuard} from "@/components/customer/layout";
import {Panel, Status} from "@/components/customer/ui";
import {useAuth} from '@/contexts/AuthContext';
import {CustomerAnalytics} from "@/features/dashboard/components/CustomerAnalytics";
import {useMissions, useServices} from "@/lib/query/customer";
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
    const realRows = missions.data?.content ?? [];
    const rows = realRows;
    const totalMissions = missions.data?.totalElements ?? 0;
    const inProgressMissions = rows.filter(m => ['PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS'].includes(m.status)).length;
    const openServices = services.data?.length ?? 0;

    return (
        <>
            {(missions.isError || services.isError) &&
                <div role="alert" className="mb-4 rounded-lg bg-danger/10 px-3.5 py-3 text-[13px] text-danger">{t('dashboard.loadError')}</div>}
            <div className="mb-7 flex flex-wrap items-center justify-between gap-5">
                <div>
                    <h1 className="m-0 flex items-center gap-2.5 text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
                        <span className="inline-block h-[26px] w-2 rounded-full bg-primary"/>
                        {t('dashboard.greeting', {name: user?.fullName || user?.username || t('dashboard.defaultName')})}
                    </h1>
                    <p className="mt-2.5 text-sm text-muted">{t('dashboard.subtitle')}</p>
                </div>
                <Link href="/customer/missions/create" className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-4 text-[13px] font-bold text-primary-foreground transition hover:-translate-y-px hover:bg-primary-hover">{t('dashboard.bookService')}</Link>
            </div>

            {/* Frame 1: KPI Grid */}
            <div className="grid grid-cols-1 items-stretch gap-[18px] md:grid-cols-2 lg:grid-cols-3">
                <Panel className="h-full border-l-4 border-l-primary">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-uav-red-light text-primary">
                            <Activity size={18}/>
                        </span>
                        <div>
                            <span className="block text-[13px] font-semibold text-muted">{t('dashboard.totalMissions')}</span>
                            <div className="mt-2 text-[28px] font-extrabold leading-none tabular-nums tracking-tight text-slate-900">{totalMissions}</div>
                            <small className="mt-2 block text-xs font-medium text-slate-500">{t('dashboard.totalMissionsHint')}</small>
                        </div>
                    </div>
                </Panel>

                <Panel className="h-full border-l-4 border-l-uav-green">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-uav-green">
                            <Plane size={18}/>
                        </span>
                        <div>
                            <span className="block text-[13px] font-semibold text-muted">{t('dashboard.inProgress')}</span>
                            <div className="mt-2 text-[28px] font-extrabold leading-none tabular-nums tracking-tight text-uav-green">{inProgressMissions}</div>
                            <small className="mt-2 block text-xs font-medium text-uav-green">{t('dashboard.inProgressHint')}</small>
                        </div>
                    </div>
                </Panel>

                <Panel className="h-full border-l-4 border-l-amber-600">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                            <Boxes size={18}/>
                        </span>
                        <div>
                            <span className="block text-[13px] font-semibold text-muted">{t('dashboard.openServices')}</span>
                            <div className="mt-2 text-[28px] font-extrabold leading-none tabular-nums tracking-tight text-slate-900">{openServices}</div>
                            <small className="mt-2 block text-xs font-medium text-slate-500">{t('dashboard.openServicesHint')}</small>
                        </div>
                    </div>
                </Panel>
            </div>

            <div className="mt-6"><CustomerAnalytics/></div>

            {/* Frame 2 & 3: Mission Stream & Quick Shortcuts */}
            <div className="mt-5 grid grid-cols-1 items-stretch gap-[18px] md:grid-cols-2">
                {/* Frame 2: Mission Table */}
                <Panel
                    title={t('dashboard.recentMissions')}
                    action={<Link href="/customer/missions" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">{t('dashboard.viewAll')}</Link>}
                    className="h-full"
                >
                    <div className="overflow-auto">
                        <table className="w-full border-collapse">
                            <thead>
                            <tr className="border-b border-border bg-background text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                                <th className="px-3.5 py-3">{t('dashboard.missionCode')}</th>
                                <th className="px-3.5 py-3">{t('dashboard.time')}</th>
                                <th className="px-3.5 py-3 text-right">{t('common.status')}</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-[13px]">
                            {!rows.length && <tr>
                                <td colSpan={3} className="px-3.5 py-3 text-muted">{missions.isPending ? t('dashboard.loadingMissions') : t('dashboard.noMissions')}</td>
                            </tr>}
                            {rows.slice(0, 5).map(m => (
                                <tr key={m.id} className="transition-colors hover:bg-background">
                                    <td className="px-3.5 py-3 align-middle">
                                        <Link className="tabular-nums font-bold text-slate-900 hover:text-primary" href={`/customer/missions/${m.id}`}>
                                            {m.code}
                                        </Link>
                                        <div className="mt-0.5 text-xs text-muted">{m.title}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-3.5 py-3 align-middle tabular-nums text-xs text-slate-500">
                                        {shortDate(m.startTime)}
                                    </td>
                                    <td className="px-3.5 py-3 text-right align-middle">
                                        <Status value={m.status}/>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                {/* Frame 3: Quota & Quick Shortcuts */}
                <div className="flex h-full flex-col justify-between gap-[18px]">
                    <Panel title={t('dashboard.quickStart')} className="flex-1">
                        <div className="flex flex-col gap-2.5">
                            <Link href="/customer/services" className="flex min-h-[44px] items-center justify-between rounded-full border border-border bg-card px-3.5 py-2.5 text-[13px] font-bold text-foreground transition hover:-translate-y-px hover:bg-background">
                                <span>{t('dashboard.exploreServices')}</span>
                            </Link>
                            <Link href="/customer/missions/create" className="flex min-h-[44px] items-center justify-between rounded-full border border-border bg-card px-3.5 py-2.5 text-[13px] font-bold text-foreground transition hover:-translate-y-px hover:bg-background">
                                <span>{t('dashboard.createRequest')}</span>
                            </Link>
                            <Link href="/customer/billing" className="flex min-h-[44px] items-center justify-between rounded-full border border-border bg-card px-3.5 py-2.5 text-[13px] font-bold text-foreground transition hover:-translate-y-px hover:bg-background">
                                <span>{t('dashboard.manageBilling')}</span>
                            </Link>
                        </div>
                    </Panel>
                </div>
            </div>
        </>
    );
}
