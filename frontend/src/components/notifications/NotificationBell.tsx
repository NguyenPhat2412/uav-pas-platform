'use client';

import React, {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {AlertCircle, Bell, CheckCheck, CheckCircle2, ChevronRight, Info, ShieldAlert} from 'lucide-react';
import {useNotifications} from '@/features/notifications/hooks/useNotifications';
import {useI18n} from '@/providers/I18nContext';

/** Top-bar notifications popover; viewAllHref points at the portal's own notifications page. */
export function NotificationBell({viewAllHref = '/operations/notifications'}: { viewAllHref?: string }) {
    const {t, formatDate} = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const {
        notifications,
        unreadCount,
        loading,
        busy,
        error,
        reload,
        markAllRead: markAllAsRead,
        markOneRead: markAsRead
    } = useNotifications();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-control border border-border bg-card text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label={t('opsMissions.notifications.title')} aria-expanded={isOpen}
                title={t('opsMissions.notifications.center')}
            >
                <Bell size={18}/>
                {unreadCount > 0 && (
                    <span
                        className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-panel bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-32px)] sm:w-96 rounded-overlay border border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden text-slate-800">
                    <div
                        className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/80">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{t('opsMissions.notifications.title')}</span>
                            {unreadCount > 0 && (
                                <span
                                    className="bg-uav-red-light text-primary text-[10px] font-bold px-2 py-0.5 rounded-panel border border-red-200">
                  {t('opsMissions.notifications.bell.newCount', {count: unreadCount})}
                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllAsRead} disabled={busy || loading}
                                className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 font-bold cursor-pointer"
                            >
                                <CheckCheck size={14}/> {t('opsMissions.notifications.bell.readAll')}
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {loading && <p role="status" className="p-3 text-sm">{t('opsMissions.notifications.loading')}</p>}
                        {error && <div role="alert" className="p-3 text-sm">{error}
                            <button type="button" onClick={reload}>{t('opsMissions.notifications.retry')}</button>
                        </div>}
                        {!loading && !error && notifications.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                {t('opsMissions.notifications.bell.empty')}
                            </div>
                        ) : (
                            notifications.map(item => (
                                <div
                                    key={item.id}
                                    role="button" tabIndex={busy ? -1 : 0} aria-disabled={busy || item.isRead}
                                    onKeyDown={event => {
                                        if ((event.key === 'Enter' || event.key === ' ') && !busy && !item.isRead) {
                                            event.preventDefault();
                                            markAsRead(item.id);
                                        }
                                    }}
                                    onClick={() => !busy && !item.isRead && markAsRead(item.id)}
                                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex gap-3 ${
                                        !item.isRead ? 'bg-uav-red-light/40' : ''
                                    }`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {item.type === 'ALERT' && <ShieldAlert size={16} className="text-primary"/>}
                                        {item.type === 'WARNING' && <AlertCircle size={16} className="text-amber-500"/>}
                                        {item.type === 'SUCCESS' &&
                                            <CheckCircle2 size={16} className="text-success"/>}
                                        {item.type === 'INFO' && <Info size={16} className="text-sky-500"/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={`text-xs font-bold truncate ${!item.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                                {item.title}
                                            </p>
                                            {!item.isRead && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"/>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                            {item.message}
                                        </p>
                                        <span className="text-[10px] text-slate-400 mt-1 block">
                      {formatDate(item.createdAt, {hour: '2-digit', minute: '2-digit'})}
                    </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-slate-100 p-2.5 bg-slate-50 text-center">
                        <Link
                            href={viewAllHref}
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-slate-600 hover:text-primary font-bold inline-flex items-center gap-1 py-1 transition"
                        >
                            {t('opsMissions.notifications.bell.viewAll')} <ChevronRight size={13}/>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
