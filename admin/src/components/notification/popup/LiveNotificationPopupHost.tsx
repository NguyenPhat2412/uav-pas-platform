'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowUpRight, BellRing, Info, ShieldAlert, X} from 'lucide-react';
import {
    useNotificationReadActions,
    useRealtimeNotificationFeed,
    type IncomingRealtimeNotificationEvent,
} from '@/hooks/notification/useNotifications';
import {
    formatModuleBadgeLabel,
    popupDurationMs,
    resolveNotificationPortalHref,
} from '@/forms/notification/notification-policy-form';
import type {
    NotificationSeverity,
    RealtimeNotificationPopupPayload,
} from '@/types/notification/notification.types';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';

interface ActivePopupCard {
    key: string;
    item: RealtimeNotificationPopupPayload;
    href: string;
    duration: number;
    isExiting: boolean;
}

interface TimerState {
    timeoutId: ReturnType<typeof setTimeout> | null;
    remaining: number;
    startedAt: number;
}

function playNotificationChime(severity?: NotificationSeverity | null) {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    try {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const notes =
            severity === 'CRITICAL'
                ? [
                      {freq: 880, start: 0, dur: 0.11, gain: 0.08},
                      {freq: 1174.66, start: 0.14, dur: 0.16, gain: 0.09},
                  ]
                : severity === 'ACTION'
                  ? [
                        {freq: 587.33, start: 0, dur: 0.09, gain: 0.045},
                        {freq: 880, start: 0.1, dur: 0.14, gain: 0.05},
                    ]
                  : [{freq: 659.25, start: 0, dur: 0.1, gain: 0.03}];
        for (const n of notes) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = severity === 'CRITICAL' ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(n.freq, now + n.start);
            gain.gain.setValueAtTime(0.0001, now + n.start);
            gain.gain.exponentialRampToValueAtTime(n.gain, now + n.start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + n.start);
            osc.stop(now + n.start + n.dur + 0.02);
        }
        setTimeout(() => void ctx.close().catch(() => undefined), 500);
    } catch {
        // Ignore locked autoplay policy prior to user gesture.
    }
}

export function LiveNotificationPopupHost({
    area,
}: {
    area: 'customer' | 'operations' | 'admin';
}) {
    const router = useRouter();
    const {t} = useI18n();
    const {markOne} = useNotificationReadActions();
    const [cards, setCards] = useState<ActivePopupCard[]>([]);
    const seenIdsRef = useRef<Set<number>>(new Set());
    const timersRef = useRef<Map<string, TimerState>>(new Map());

    const dismissCard = useCallback((key: string) => {
        const entry = timersRef.current.get(key);
        if (entry?.timeoutId) clearTimeout(entry.timeoutId);
        timersRef.current.delete(key);
        setCards(prev => prev.map(c => (c.key === key ? {...c, isExiting: true} : c)));
        setTimeout(() => {
            setCards(prev => prev.filter(c => c.key !== key));
        }, 280);
    }, []);

    const pauseCard = useCallback((key: string) => {
        const entry = timersRef.current.get(key);
        if (!entry || !entry.timeoutId) return;
        clearTimeout(entry.timeoutId);
        entry.timeoutId = null;
        entry.remaining = Math.max(400, entry.remaining - (Date.now() - entry.startedAt));
    }, []);

    const resumeCard = useCallback(
        (key: string) => {
            const entry = timersRef.current.get(key);
            if (!entry || entry.timeoutId || entry.remaining <= 0) return;
            entry.startedAt = Date.now();
            entry.timeoutId = setTimeout(() => dismissCard(key), entry.remaining);
        },
        [dismissCard],
    );

    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            for (const entry of timers.values()) {
                if (entry.timeoutId) clearTimeout(entry.timeoutId);
            }
            timers.clear();
        };
    }, []);

    const fireBrowserOsNotification = useCallback(
        (item: RealtimeNotificationPopupPayload, href: string) => {
            if (typeof window === 'undefined' || !('Notification' in window)) return;
            if (window.Notification.permission !== 'granted') return;
            const isTestFire =
                item.title.startsWith('[Kiểm thử]') || item.title.startsWith('[Test]');
            const tabHidden =
                document.visibilityState === 'hidden' || !document.hasFocus();
            if (!tabHidden && !isTestFire) return;
            try {
                const osNotif = new window.Notification(item.title, {
                    body: item.content || '',
                    tag: `uav-notif-${item.id}`,
                });
                osNotif.onclick = () => {
                    window.focus();
                    if (item.id) markOne.mutate(item.id);
                    router.push(href);
                    osNotif.close();
                };
            } catch {
                // Ignore browser environments without Notification constructor support.
            }
        },
        [markOne, router],
    );

    const handleIncoming = useCallback(
        (event: IncomingRealtimeNotificationEvent) => {
            const {notification, screenPopup, desktopOs} = event;
            if (!notification || typeof notification.id !== 'number') return;
            if (seenIdsRef.current.has(notification.id)) return;
            seenIdsRef.current.add(notification.id);
            if (seenIdsRef.current.size > 200) {
                const first = seenIdsRef.current.values().next().value;
                if (first !== undefined) seenIdsRef.current.delete(first);
            }

            const href = resolveNotificationPortalHref(area, notification);
            if (desktopOs) fireBrowserOsNotification(notification, href);
            if (!screenPopup) return;

            playNotificationChime(notification.severity);
            const duration = popupDurationMs(notification.severity);
            const key = `popup_${notification.id}_${Date.now()}`;
            setCards(prev =>
                [{key, item: notification, href, duration, isExiting: false}, ...prev].slice(0, 3),
            );

            if (duration > 0) {
                const timeoutId = setTimeout(() => dismissCard(key), duration);
                timersRef.current.set(key, {
                    timeoutId,
                    remaining: duration,
                    startedAt: Date.now(),
                });
            }
        },
        [area, dismissCard, fireBrowserOsNotification],
    );

    useRealtimeNotificationFeed(handleIncoming);

    if (cards.length === 0) return null;

    return (
        <div
            aria-live="assertive"
            className="pointer-events-none fixed top-16 right-4 left-4 z-[95] flex w-auto max-w-[calc(100vw-2rem)] flex-col gap-2.5 sm:left-auto sm:w-[372px]"
        >
            {cards.map(({key, item, href, duration, isExiting}) => {
                const isCritical = item.severity === 'CRITICAL';
                const isAction = item.severity === 'ACTION';
                const Icon = isCritical ? ShieldAlert : isAction ? BellRing : Info;
                const severityKey = isCritical
                    ? 'notificationCenter.severityCRITICAL'
                    : isAction
                      ? 'notificationCenter.severityACTION'
                      : 'notificationCenter.severityINFO';

                return (
                    <div
                        key={key}
                        role="alert"
                        onMouseEnter={() => pauseCard(key)}
                        onMouseLeave={() => resumeCard(key)}
                        className={cn(
                            'group uav-bezel pointer-events-auto shadow-[0_18px_40px_-14px_rgba(15,23,42,0.26)]',
                            isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right',
                        )}
                    >
                        <div
                            className={cn(
                                'uav-bezel-core relative overflow-hidden p-3.5',
                                isCritical && 'ring-1 ring-primary/40',
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'absolute inset-y-0 left-0 w-1',
                                    isCritical
                                        ? 'bg-primary'
                                        : isAction
                                          ? 'bg-slate-800'
                                          : 'bg-slate-400',
                                )}
                            />
                            <div className="flex items-start gap-3 pl-1.5">
                                <div className="relative mt-0.5 shrink-0">
                                    {isCritical && (
                                        <span
                                            aria-hidden="true"
                                            className="animate-pulse-ring absolute inset-0 rounded-control bg-primary/30"
                                        />
                                    )}
                                    <div
                                        className={cn(
                                            'relative flex h-8 w-8 items-center justify-center rounded-control border',
                                            isCritical
                                                ? 'border-rose-200 bg-rose-50 text-primary'
                                                : isAction
                                                  ? 'border-slate-200 bg-slate-100 text-slate-900'
                                                  : 'border-slate-200 bg-slate-50 text-slate-600',
                                        )}
                                    >
                                        <Icon size={16} aria-hidden="true"/>
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span
                                                className={cn(
                                                    'rounded-badge px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                                                    isCritical
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-slate-100 text-slate-700',
                                                )}
                                            >
                                                {formatModuleBadgeLabel(item.moduleCode)}
                                            </span>
                                            <span className="text-[10.5px] font-semibold text-muted">
                                                {t(severityKey)}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => dismissCard(key)}
                                            aria-label={t('notificationCenter.popupDismiss')}
                                            className="rounded-control p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
                                        >
                                            <X size={14}/>
                                        </button>
                                    </div>

                                    <p className="mt-1 text-[13px] leading-snug font-bold break-words text-on-surface">
                                        {item.title}
                                    </p>
                                    {item.content && (
                                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed break-words text-muted">
                                            {item.content}
                                        </p>
                                    )}

                                    <div className="mt-2.5 flex items-center justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (item.id) markOne.mutate(item.id);
                                                dismissCard(key);
                                                router.push(href);
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded-control bg-slate-900 px-2.5 py-1 text-[11.5px] font-bold text-white transition-colors duration-150 hover:bg-primary"
                                        >
                                            <span>{t('notificationCenter.popupOpen')}</span>
                                            <ArrowUpRight size={13} aria-hidden="true"/>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {duration > 0 && (
                                <div className="mt-3 -mx-3.5 -mb-3.5 h-0.5 overflow-hidden bg-slate-100">
                                    <div
                                        className={cn(
                                            'animate-toast-progress h-full origin-left group-hover:[animation-play-state:paused]',
                                            isAction ? 'bg-slate-800' : 'bg-slate-400',
                                        )}
                                        style={{animationDuration: `${duration}ms`}}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
