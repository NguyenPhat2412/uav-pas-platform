'use client';

import React, {useState} from 'react';
import {AlertCircle, CheckCheck, CheckCircle2, Clock, Filter, Info, ShieldAlert} from 'lucide-react';
import {PageGuard} from "@/components/customer/CustomerLayout";
import {Button, Panel} from "@/components/customer/CustomerUi";
import {type NotificationItem, useNotifications} from '@/hooks/notification/useNotifications';
import {useI18n} from '@/providers/I18nContext';
import {FilterSelect} from '@/components/shared/FilterSelect';

export default function CustomerNotificationsPage() {
    const {notifications, unreadCount, loading, busy, error, reload, markAllRead, markOneRead} = useNotifications();
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
    const {t, formatDate} = useI18n();

    const visibleItems = filter === 'UNREAD' ? notifications.filter(n => !n.isRead) : notifications;

    const getBadgeStyle = (type: NotificationItem['type']) => {
        switch (type) {
            case 'ALERT':
                return {className: 'bg-rose-50 border-rose-200 text-primary', label: t('notificationsPage.urgent')};
            case 'WARNING':
                return {className: 'bg-amber-50 border-amber-200 text-amber-700', label: t('notificationsPage.warning')};
            case 'SUCCESS':
                return {className: 'bg-uav-blue-light border-blue-200 text-uav-blue', label: t('notificationsPage.done')};
            default:
                return {className: 'bg-slate-100 border-slate-300 text-slate-700', label: t('notificationsPage.system')};
        }
    };

    return (
        <PageGuard permission={null}>
            {loading && <p role="status" className="m-0 border-b border-slate-200 px-5 py-4 text-sm text-slate-500">{t('notificationsPage.loading')}</p>}
            {error && (
                <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-danger text-[13px] flex items-center justify-between gap-3 flex-wrap">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={reload}
                        className="text-primary font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                    >
                        {t('common.retry')}
                    </button>
                </div>
            )}
            <Panel
                title={t('notificationsPage.recent')}
                className="flex-1 border-0 [&>div]:p-0"
                action={
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500">
                            <Filter size={13}/> {t('notificationsPage.clickHint')}
                        </span>
                        <FilterSelect label={t('notificationsPage.filter')} value={filter} onChange={setFilter}
                                      options={[
                                          {value: 'ALL', label: t('notificationsPage.all', {count: notifications.length})},
                                          {value: 'UNREAD', label: t('notificationsPage.unread', {count: unreadCount})},
                                      ]}/>
                        {unreadCount > 0 && (
                            <Button type="button" variant="secondary" onClick={markAllRead} disabled={busy || loading}>
                                <span className="inline-flex items-center gap-1.5">
                                    <CheckCheck size={15}/> {t('notificationsPage.markRead', {count: unreadCount})}
                                </span>
                            </Button>
                        )}
                    </div>
                }
            >
                {!loading && !error && visibleItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">{t('notificationsPage.empty')}</div>
                ) : (
                    <div className="flex flex-col divide-y divide-slate-200">
                        {visibleItems.map(item => {
                            const badge = getBadgeStyle(item.type);
                            return (
                                <div
                                    key={item.id}
                                    role="button" tabIndex={busy ? -1 : 0} aria-disabled={busy || item.isRead}
                                    onKeyDown={event => {
                                        if ((event.key === 'Enter' || event.key === ' ') && !busy && !item.isRead) {
                                            event.preventDefault();
                                            markOneRead(item.id);
                                        }
                                    }}
                                    onClick={() => !busy && !item.isRead && markOneRead(item.id)}
                                    className={`flex items-start gap-3.5 px-5 py-4 transition-all duration-150 ${
                                        !item.isRead
                                            ? 'bg-gradient-to-r from-primary/5 to-card cursor-pointer hover:bg-primary/10'
                                            : 'bg-card cursor-default'
                                    }`}
                                >
                                    <div
                                        className={`w-[38px] h-[38px] rounded-panel border flex items-center justify-center shrink-0 mt-0.5 ${badge.className}`}
                                    >
                                        {item.type === 'ALERT' && <ShieldAlert size={19}/>}
                                        {item.type === 'WARNING' && <AlertCircle size={19}/>}
                                        {item.type === 'SUCCESS' && <CheckCircle2 size={19}/>}
                                        {item.type === 'INFO' && <Info size={19}/>}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-panel border ${badge.className}`}>
                                                    {badge.label}
                                                </span>
                                                <strong className={`text-sm font-bold ${!item.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                                                    {item.title}
                                                </strong>
                                            </div>
                                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                                <Clock size={12}/>
                                                {formatDate(item.createdAt)}
                                            </span>
                                        </div>
                                        <p className="mt-2 mb-0 text-[13.5px] leading-relaxed text-slate-500">
                                            {item.message}
                                        </p>
                                    </div>

                                    {!item.isRead && (
                                        <div className="self-center shrink-0" title={t('notificationsPage.unreadDot')}>
                                            <span className="w-2.5 h-2.5 rounded-full bg-primary block ring-4 ring-primary/15"/>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Panel>
        </PageGuard>
    );
}
