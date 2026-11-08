'use client';

import {useState} from 'react';
import {AlertCircle, Bell, CheckCheck, CheckCircle2, Clock, Info, Search, ShieldAlert} from 'lucide-react';
import {Alert, Badge, type BadgeProps, Button, Card, FormField, Input, Select, Spinner} from '@/components/ui';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/providers/I18nContext';

const typeTone: Record<string, { icon: typeof Info; variant: NonNullable<BadgeProps['variant']> }> = {
    ALERT: {icon: ShieldAlert, variant: 'error'},
    WARNING: {icon: AlertCircle, variant: 'warning'},
    SUCCESS: {icon: CheckCircle2, variant: 'success'},
    INFO: {icon: Info, variant: 'secondary'},
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
                <Card className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-end">
                    <FormField id="ops-notif-search" label={t('opsMissions.notifications.searchLabel')} optional={false} className="min-w-[200px] flex-1">
                        <Input
                            id="ops-notif-search"
                            type="search"
                            placeholder={t('opsMissions.notifications.searchPlaceholder')}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            leftIcon={<Search size={16} aria-hidden="true"/>}
                            className="h-9 text-[13px]"
                        />
                    </FormField>
                    <FormField id="ops-notif-type" label={t('opsMissions.notifications.col.type')} optional={false} className="w-full sm:w-52 lg:shrink-0">
                        <Select
                            id="ops-notif-type"
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="h-9 text-[13px]"
                        >
                            {['ALL', 'ALERT', 'WARNING', 'INFO', 'SUCCESS'].map(id => (
                                <option key={id} value={id}>{t(`opsMissions.notifications.filter.${id}`)}</option>
                            ))}
                        </Select>
                    </FormField>
                    {unreadCount > 0 && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={markAllRead}
                            disabled={busy || loading}
                            leftIcon={<CheckCheck size={16} aria-hidden="true"/>}
                            className="shrink-0 text-xs font-bold"
                        >
                            {t('opsMissions.notifications.markAll', {count: unreadCount})}
                        </Button>
                    )}
                </Card>

                {error && (
                    <Alert variant="error" className="text-[13px]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span>{error}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={reload} className="h-7 px-2 text-xs font-bold">
                                {t('opsMissions.notifications.retry')}
                            </Button>
                        </div>
                    </Alert>
                )}

                <Card className="overflow-x-auto" tabIndex={0} aria-label={t('opsMissions.notifications.title')}>
                    <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
                        <thead>
                        <tr>
                            {(['type', 'title', 'message', 'time', 'status'] as const).map(col => (
                                <th key={col} className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold text-slate-500">
                                    {t(`opsMissions.notifications.col.${col}`)}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center">
                                    <Spinner size="sm" label={t('opsMissions.notifications.loading')}/>
                                </td>
                            </tr>
                        ) : !error && filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center">
                                    <Bell size={30} className="mx-auto mb-2 text-slate-300" aria-hidden="true"/>
                                    <p className="m-0 font-bold text-slate-600">{t('opsMissions.notifications.emptyTitle')}</p>
                                    <p className="m-0 mt-1 text-xs text-slate-400">{t('opsMissions.notifications.emptyHint')}</p>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(item => {
                                const tone = typeTone[item.type] ?? typeTone.INFO;
                                const Icon = tone.icon;
                                return (
                                    <tr key={item.id} className={item.isRead ? 'transition-colors hover:bg-slate-50/70' : 'bg-uav-red-light/40 transition-colors hover:bg-uav-red-light/70'}>
                                        <td className="whitespace-nowrap px-4 py-3 align-top">
                                            <Badge variant={tone.variant} size="sm" icon={<Icon size={12} aria-hidden="true"/>}>
                                                {t(`opsMissions.notifications.filter.${item.type}`)}
                                            </Badge>
                                        </td>
                                        <td className={`px-4 py-3 align-top ${item.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                                            {item.title}
                                        </td>
                                        <td className="max-w-[520px] px-4 py-3 align-top text-[13px] leading-relaxed text-slate-600">
                                            {item.message}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 align-top text-xs tabular-nums text-slate-500">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Clock size={12} aria-hidden="true"/>
                                                {formatDate(item.createdAt, {dateStyle: 'short', timeStyle: 'medium'})}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 align-top">
                                            {item.isRead ? (
                                                <Badge variant="default" size="sm">{t('opsMissions.notifications.read')}</Badge>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={busy}
                                                    onClick={() => markOneRead(item.id)}
                                                    className="h-7 px-2.5 text-xs font-semibold text-primary"
                                                    leftIcon={<span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true"/>}
                                                >
                                                    {t('opsMissions.notifications.markOne')}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </Card>
            </div>
        </OperationsPage>
    );
}
