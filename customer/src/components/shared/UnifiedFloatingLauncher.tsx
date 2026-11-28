'use client';

import {useEffect, useRef, useState} from 'react';
import {MessageCircleMore, Sparkles, X} from 'lucide-react';
import {OPEN_SUPPORT_WIDGET_EVENT} from '@/hooks/usePublicSupport';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';

export const OPEN_ASSISTANT_WIDGET_EVENT = 'uav-pas:open-assistant-widget';

/**
 * Single unified bottom-right launcher for the Customer Portal.
 * Replaces the stacked Support + AI Assistant floating circles with one compact trigger
 * that opens a 2-option popover menu (UI-REVIEW-9-FIXES #7).
 */
export function UnifiedFloatingLauncher() {
    const {t} = useI18n();
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

    const openAssistant = () => {
        setMenuOpen(false);
        window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_WIDGET_EVENT));
    };

    const openSupport = () => {
        setMenuOpen(false);
        window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_WIDGET_EVENT, {detail: {}}));
    };

    return (
        <div
            ref={wrapperRef}
            className="fixed right-4 bottom-20 z-40 flex flex-col items-end gap-2 sm:right-5 sm:bottom-5"
        >
            {menuOpen && (
                <div
                    role="menu"
                    aria-label={t('marketplaceShop.fabMenuLabel')}
                    className="w-52 overflow-hidden rounded-panel border border-slate-200 bg-white p-1.5 shadow-xl"
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
                        <span>{t('marketplaceShop.fabAiAssistant')}</span>
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={openSupport}
                        className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-control px-3 py-2 text-left text-xs font-semibold text-slate-800 transition-colors hover:bg-uav-red-light hover:text-primary"
                    >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                            <MessageCircleMore size={14} aria-hidden="true"/>
                        </span>
                        <span>{t('marketplaceShop.fabLiveSupport')}</span>
                    </button>
                </div>
            )}

            <button
                type="button"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label={t('marketplaceShop.fabMenuLabel')}
                title={t('marketplaceShop.fabMenuLabel')}
                onClick={() => setMenuOpen(prev => !prev)}
                className={cn(
                    'inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 shadow-lg transition-[transform,background-color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95',
                    menuOpen
                        ? 'border-primary bg-white text-primary'
                        : 'border-primary bg-primary text-primary-foreground hover:bg-primary-hover',
                )}
            >
                {menuOpen ? <X size={20} aria-hidden="true"/> : <MessageCircleMore size={20} aria-hidden="true"/>}
            </button>
        </div>
    );
}
