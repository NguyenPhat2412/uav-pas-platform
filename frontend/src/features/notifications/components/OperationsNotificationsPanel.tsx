'use client';

import {useState} from 'react';
import {AlertCircle, Bell, CheckCheck, CheckCircle2, Clock, Info, Search, ShieldAlert} from 'lucide-react';
import {useNotifications} from '@/features/notifications/hooks/useNotifications';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/providers/I18nContext';
import {FilterSelect} from '@/components/shared/FilterSelect';

const typeTone: Record<string, { icon: typeof Info; badge: string }> = {
    ALERT: {icon: ShieldAlert, badge: 'border-rose-200 bg-rose-50 text-primary'},
    WARNING: {icon: AlertCircle, badge: 'border-amber-200 bg-amber-50 text-amber-700'},
    SUCCESS: {icon: CheckCircle2, badge: 'border-blue-200 bg-uav-blue-light text-uav-blue'},
    INFO: {icon: Info, badge: 'border-sky-200 bg-sky-50 text-sky-700'},
};

export default function NotificationsPage() {
    const {notifications, unreadCount, loading, busy, error, reload, markAllRead, markOneRead} = useNotifications();
    const {t, formatDate} = useI18n();
    const [filterType, setFilterType] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const filtered = notifications.filter(n => {
        if (filterType !== 'ALL' && n.type !== filterType) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
        }
        return true;
    });


    return (
        <OperationsPage permission={null} activeResource="notifications">
            <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-panel border border-border bg-card p-3.5 lg:flex-row lg:items-center">
                    <label className="relative flex min-w-[200px] flex-1 items-center">
                        <Search size={16} className="pointer-events-none absolute left-3 text-slate-400" aria-hidden="true"/>
                        <input
                            type="text"
                            aria-label={t('opsMissions.notifications.searchLabel')}
                            placeholder={t('opsMissions.notifications.searchPlaceholder')}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="h-9 w-full rounded-control border border-border bg-card pl-9 pr-3 text-[13px] text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none"
                        />
                    </label>
                    <FilterSelect label={t('opsMissions.notifications.col.type')} value={filterType} onChange={setFilterType}
                                  className="shrink-0 self-start lg:self-auto"
                                  options={['ALL', 'ALERT', 'WARNING', 'INFO', 'SUCCESS'].map(id => ({value: id, label: t(`opsMissions.notifications.filter.${id}`)}))}/>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={markAllRead} disabled={busy || loading}
                            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-control border border-blue-200 bg-uav-blue-light px-3.5 text-xs font-bold text-uav-blue transition hover:bg-blue-100 disabled:opacity-60 cursor-pointer"
                        >
                            <CheckCheck size={16} aria-hidden="true"/> {t('opsMissions.notifications.markAll', {count: unreadCount})}
                        </button>
                    )}
                </div>

                {error && (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-rose-50 px-3.5 py-3 text-[13px] text-danger">
                        <span>{error}</span>
                        <button type="button" onClick={reload} className="cursor-pointer border-0 bg-transparent p-0 font-bold text-primary hover:underline">
                            {t('opsMissions.notifications.retry')}
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto rounded-panel border border-border bg-card" tabIndex={0} aria-label={t('opsMissions.notifications.title')}>
                    <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
                        <thead>
                        <tr>
                            {(['type', 'title', 'message', 'time', 'status'] as const).map(col =>
                                <th key={col} className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold text-slate-500">
                                    {t(`opsMissions.notifications.col.${col}`)}</th>)}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                        {loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500" role="status">{t('opsMissions.notifications.loading')}</td></tr>
                            : !error && filtered.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center">
                                <Bell size={30} className="mx-auto mb-2 text-slate-300" aria-hidden="true"/>
                                <p className="m-0 font-bold text-slate-600">{t('opsMissions.notifications.emptyTitle')}</p>
                                <p className="m-0 mt-1 text-xs text-slate-400">{t('opsMissions.notifications.emptyHint')}</p>
                            </td></tr>
                            : filtered.map(item => {
                                const tone = typeTone[item.type] ?? typeTone.INFO;
                                const Icon = tone.icon;
                                return <tr key={item.id} className={item.isRead ? 'transition-colors hover:bg-slate-50/70' : 'bg-uav-red-light/40 transition-colors hover:bg-uav-red-light/70'}>
                                    <td className="whitespace-nowrap px-4 py-3 align-top">
                                        <span className={`inline-flex items-center gap-1.5 rounded-badge border px-2.5 py-0.5 text-xs font-semibold ${tone.badge}`}>
                                            <Icon size={13} aria-hidden="true"/>{t(`opsMissions.notifications.filter.${item.type}`)}</span>
                                    </td>
                                    <td className={`px-4 py-3 align-top ${item.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>{item.title}</td>
                                    <td className="max-w-[520px] px-4 py-3 align-top text-[13px] leading-relaxed text-slate-600">{item.message}</td>
                                    <td className="whitespace-nowrap px-4 py-3 align-top text-xs tabular-nums text-slate-500">
                                        <span className="inline-flex items-center gap-1.5"><Clock size={12} aria-hidden="true"/>{formatDate(item.createdAt, {dateStyle: 'short', timeStyle: 'medium'})}</span>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 align-top">
                                        {item.isRead ? <span className="text-xs text-slate-400">{t('opsMissions.notifications.read')}</span>
                                            : <button type="button" disabled={busy} onClick={() => markOneRead(item.id)}
                                                      className="inline-flex items-center gap-1.5 rounded-control border border-border bg-card px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-uav-red-light disabled:opacity-60 cursor-pointer">
                                                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true"/>{t('opsMissions.notifications.markOne')}</button>}
                                    </td>
                                </tr>;
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </OperationsPage>
    );
}
