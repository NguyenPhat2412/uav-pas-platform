'use client';

import {useEffect, useRef, useState} from 'react';
import {MessageCircleMore, Sparkles, X} from 'lucide-react';
import {useOpsSupportSummary} from '@/hooks/support/useOperationsSupport';
import {cn} from '@/lib/utils';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';

export const OPEN_ASSISTANT_WIDGET_EVENT = 'uav-pas:open-assistant-widget';
export const OPEN_OPS_SUPPORT_DOCK_EVENT = 'uav-pas:open-ops-support-dock';

/**
 * Single unified bottom-right launcher for the Operations Portal.
 * Replaces stacked Support + AI Assistant floating circles with one compact trigger
 * (opening a 2-option menu when Support Inbox permission is present, or toggling AI Assistant directly)
 * so floating controls never overlap right-edge content (UI-REVIEW-9-FIXES #7).
 */
export function UnifiedFloatingLauncher() {
    const {t} = useI18n();
    const {isAuthenticated, permissionsReady, can} = useAuth();
    const canSupport = isAuthenticated && permissionsReady && can('SUPPORT_MANAGE');
    const summaryQuery = useOpsSupportSummary(canSupport);
    const unreadMessages = canSupport ? (summaryQuery.data?.unreadMessages ?? 0) : 0;

    const [menuOpen, setMenuOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onPointerDown = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    if (!isAuthenticated) return null;

    const openAssistant = () => {
        setMenuOpen(false);
        window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_WIDGET_EVENT));
    };

    const openSupport = () => {
        setMenuOpen(false);
        window.dispatchEvent(new CustomEvent(OPEN_OPS_SUPPORT_DOCK_EVENT));
    };

    const handleTriggerClick = () => {
        if (!canSupport) {
            openAssistant();
            return;
        }
        setMenuOpen(prev => !prev);
    };

    const label = canSupport ? t('opsMarketplace.common.fabMenuLabel') : t('opsMarketplace.common.fabAiAssistant');

    return (
        <div
            ref={wrapperRef}
            className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2 sm:right-5 sm:bottom-5"
        >
            {canSupport && menuOpen && (
                <div
                    role="menu"
                    aria-label={t('opsMarketplace.common.fabMenuLabel')}
                    className="w-56 overflow-hidden rounded-panel border border-slate-200 bg-white p-1.5 shadow-xl"
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={openAssistant}
                        className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-control px-3 py-2 text-left text-xs font-semibold text-slate-800 transition-colors hover:bg-uav-red-light hover:text-primary"
                    >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-uav-red-light text-primary">
                            <Sparkles size={14} aria-hidden="true"/>
                        </span>
                        <span>{t('opsMarketplace.common.fabAiAssistant')}</span>
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={openSupport}
                        className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-control px-3 py-2 text-left text-xs font-semibold text-slate-800 transition-colors hover:bg-uav-red-light hover:text-primary"
                    >
                        <span className="inline-flex items-center gap-2.5">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                                <MessageCircleMore size={14} aria-hidden="true"/>
                            </span>
                            <span>{t('opsMarketplace.common.fabLiveSupport')}</span>
                        </span>
                        {unreadMessages > 0 && (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                {unreadMessages > 99 ? '99+' : unreadMessages}
                            </span>
                        )}
                    </button>
                </div>
            )}

            <button
                type="button"
                aria-expanded={canSupport ? menuOpen : undefined}
                aria-haspopup={canSupport ? 'menu' : undefined}
                aria-label={label}
                title={label}
                onClick={handleTriggerClick}
                className={cn(
                    'relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 shadow-lg transition-[transform,background-color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95',
                    menuOpen
                        ? 'border-primary bg-white text-primary'
                        : 'border-primary bg-primary text-primary-foreground hover:bg-primary-hover',
                )}
            >
                {menuOpen ? (
                    <X size={18} aria-hidden="true"/>
                ) : canSupport ? (
                    <MessageCircleMore size={18} aria-hidden="true"/>
                ) : (
                    <Sparkles size={18} aria-hidden="true"/>
                )}
                {unreadMessages > 0 && !menuOpen && (
                    <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                )}
            </button>
        </div>
    );
}
