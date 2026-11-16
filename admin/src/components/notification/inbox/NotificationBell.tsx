'use client';

import React, {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {AlertCircle, Bell, CheckCheck, CheckCircle2, ChevronRight, Info, ShieldAlert} from 'lucide-react';
import {Alert, Badge, Button, Card, Spinner} from '@/components/ui';
import {useNotifications} from '@/hooks/notification/useNotifications';
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
        markOneRead: markAsRead,
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
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="relative h-9 w-9 px-0 text-slate-600 hover:text-slate-900"
                aria-label={t('opsMissions.notifications.title')}
                aria-expanded={isOpen}
                title={t('opsMissions.notifications.center')}
            >
                <Bell size={18}/>
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-panel bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <Card
                    variant="glass"
                    className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-32px)] overflow-hidden rounded-overlay border-slate-200 bg-white/95 text-slate-800 shadow-2xl sm:w-96"
                >
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{t('opsMissions.notifications.title')}</span>
                            {unreadCount > 0 && (
                                <Badge variant="primary" size="sm" pulse>
                                    {t('opsMissions.notifications.bell.newCount', {count: unreadCount})}
                                </Badge>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                disabled={busy || loading}
                                leftIcon={<CheckCheck size={14}/>}
                                className="h-7 px-2 text-xs font-bold"
                            >
                                {t('opsMissions.notifications.bell.readAll')}
                            </Button>
                        )}
                    </div>

                    <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                        {loading && (
                            <div className="p-4 text-center">
                                <Spinner size="sm" label={t('opsMissions.notifications.loading')}/>
                            </div>
                        )}
                        {error && (
                            <div className="p-3">
                                <Alert variant="error" className="p-3 text-xs">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span>{error}</span>
                                        <Button type="button" variant="ghost" size="sm" onClick={reload} className="h-7 px-2 text-xs font-bold">
                                            {t('opsMissions.notifications.retry')}
                                        </Button>
                                    </div>
                                </Alert>
                            </div>
                        )}
                        {!loading && !error && notifications.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                {t('opsMissions.notifications.bell.empty')}
                            </div>
                        ) : (
                            notifications.map(item => (
                                <div
                                    key={item.id}
                                    role="button"
                                    tabIndex={busy ? -1 : 0}
                                    aria-disabled={busy || item.isRead}
                                    onKeyDown={event => {
                                        if ((event.key === 'Enter' || event.key === ' ') && !busy && !item.isRead) {
                                            event.preventDefault();
                                            markAsRead(item.id);
                                        }
                                    }}
                                    onClick={() => !busy && !item.isRead && markAsRead(item.id)}
                                    className={`flex cursor-pointer gap-3 p-3.5 transition hover:bg-slate-50 ${!item.isRead ? 'bg-uav-red-light/40' : ''}`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {item.type === 'ALERT' && <ShieldAlert size={16} className="text-primary"/>}
                                        {item.type === 'WARNING' && <AlertCircle size={16} className="text-amber-500"/>}
                                        {item.type === 'SUCCESS' && <CheckCircle2 size={16} className="text-success"/>}
                                        {item.type === 'INFO' && <Info size={16} className="text-sky-500"/>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={`truncate text-xs font-bold ${!item.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                                {item.title}
                                            </p>
                                            {!item.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"/>}
                                        </div>
                                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                                            {item.message}
                                        </p>
                                        <span className="mt-1 block text-[10px] text-slate-400">
                                            {formatDate(item.createdAt, {hour: '2-digit', minute: '2-digit'})}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50 p-2.5 text-center">
                        <Link
                            href={viewAllHref}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 py-1 text-xs font-bold text-slate-600 transition hover:text-primary"
                        >
                            {t('opsMissions.notifications.bell.viewAll')} <ChevronRight size={13}/>
                        </Link>
                    </div>
                </Card>
            )}
        </div>
    );
}
