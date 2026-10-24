'use client';

import React, {useState} from 'react';
import {AlertCircle, Bell, CheckCheck, CheckCircle2, Clock, Info, Search, ShieldAlert} from 'lucide-react';
import {useNotifications} from "@/features/notifications/hooks/useNotifications";
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/contexts/I18nContext';

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
        <OperationsPage title={t('opsMissions.notifications.title')} permission={null} activeResource="notifications">
            <div className="portal-management space-y-6">
                {/* Header */}
                <div
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <Bell className="text-[#ab2523]"/> {t('opsMissions.notifications.center')}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {t('opsMissions.notifications.subtitle')}
                        </p>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={markAllRead} disabled={busy || loading}
                            className="portal-button portal-button-outline flex items-center gap-2 px-4 py-2 bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#007f3e] border border-[#a7f3d0] rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                            <CheckCheck size={16}/> {t('opsMissions.notifications.markAll', {count: unreadCount})}
                        </button>
                    )}
                </div>

                {/* Filter and search bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input
                            type="text"
                            aria-label={t('opsMissions.notifications.searchLabel')}
                            placeholder={t('opsMissions.notifications.searchPlaceholder')}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ab2523] transition shadow-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {['ALL', 'ALERT', 'WARNING', 'INFO', 'SUCCESS'].map(id => ({id, label: t(`opsMissions.notifications.filter.${id}`)})).map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterType(f.id)}
                                aria-pressed={filterType === f.id}
                                className={`portal-button px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                                    filterType === f.id
                                        ? 'bg-[#ab2523] text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && <p role="status">{t('opsMissions.notifications.loading')}</p>}
                {error && <div role="alert">{error}
                    <button type="button" onClick={reload}>{t('opsMissions.notifications.retry')}</button>
                </div>}
                {/* List */}
                <div className="space-y-3">
                    {!loading && !error && filtered.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-xs">
                            <Bell size={36} className="mx-auto text-slate-300 mb-3"/>
                            <p className="text-slate-600 font-bold">{t('opsMissions.notifications.emptyTitle')}</p>
                            <p className="text-xs text-slate-400 mt-1">{t('opsMissions.notifications.emptyHint')}</p>
                        </div>
                    ) : (
                        filtered.map(item => (
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
                                className={`p-4 rounded-2xl border transition cursor-pointer flex gap-4 ${
                                    !item.isRead
                                        ? 'bg-white border-[#fecdd3] border-l-4 border-l-[#ab2523] shadow-xs'
                                        : 'bg-white border-slate-200/90 hover:bg-slate-50/70'
                                }`}
                            >
                                <div className="mt-1 shrink-0">
                                    {item.type === 'ALERT' && (
                                        <div
                                            className="w-9 h-9 rounded-xl bg-[#fef2f2] border border-[#fecdd3] flex items-center justify-center text-[#ab2523]">
                                            <ShieldAlert size={20}/>
                                        </div>
                                    )}
                                    {item.type === 'WARNING' && (
                                        <div
                                            className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                                            <AlertCircle size={20}/>
                                        </div>
                                    )}
                                    {item.type === 'SUCCESS' && (
                                        <div
                                            className="w-9 h-9 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#007f3e]">
                                            <CheckCircle2 size={20}/>
                                        </div>
                                    )}
                                    {item.type === 'INFO' && (
                                        <div
                                            className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                                            <Info size={20}/>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                        <h3 className={`text-sm font-bold ${!item.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                                            {item.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Clock size={12}/>
                                            <span>{formatDate(item.createdAt, {dateStyle: 'short', timeStyle: 'medium'})}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                        {item.message}
                                    </p>
                                </div>

                                {!item.isRead && (
                                    <div className="self-center shrink-0">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full bg-[#ab2523] block ring-4 ring-rose-100"/>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </OperationsPage>
    );
}
