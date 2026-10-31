'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {X, type LucideIcon} from 'lucide-react';
import {useDropdownMenu} from '@/hooks/useDropdownMenu';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import type {WorkspaceTab} from '@/lib/workspace-tabs';

interface TabLabel {
    label: string;
    icon: LucideIcon;
}

const menuItemClass = 'block w-full rounded-md px-3 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none disabled:opacity-40';

/**
 * The strip of open pages under the portal header, like browser tabs: click to switch, × or a middle
 * click to close, right click for "close others / close all". A dot marks the page with unsaved input,
 * and leaving or closing that page asks first. Hidden below md, where the sidebar drawer is enough.
 */
export function WorkspaceTabs({tabs, activeHref, pinnedHref, dirtyHref, describe, onClose, onCloseOthers}: {
    tabs: WorkspaceTab[];
    activeHref?: string;
    pinnedHref: string;
    dirtyHref: string | null;
    describe: (href: string) => TabLabel | undefined;
    onClose: (href: string) => string | undefined;
    onCloseOthers: (keep?: string) => string | undefined;
}) {
    const {t} = useI18n();
    const router = useRouter();
    const strip = useRef<HTMLDivElement>(null);
    const {open: menuOpen, setOpen: setMenuOpen, close: closeMenu, root: menuRoot} = useDropdownMenu();
    const [menuFor, setMenuFor] = useState<{ href: string; x: number; y: number } | null>(null);
    const visible = tabs.filter(tab => describe(tab.href));

    useEffect(() => {
        strip.current?.querySelector('[aria-current="page"]')?.scrollIntoView({block: 'nearest', inline: 'nearest'});
    }, [activeHref, tabs.length]);

    // Unsaved input lives only on the page on screen, so only leaving that page needs a confirmation.
    const mayLeave = () => dirtyHref !== activeHref || !activeHref || window.confirm(t('shell.tabs.discardConfirm'));
    const go = (path?: string) => {
        if (path) router.push(path);
    };
    const close = (href: string) => {
        if (href === activeHref && !mayLeave()) return;
        go(onClose(href));
    };
    const closeOthers = (keep?: string) => {
        if (keep !== activeHref && activeHref !== pinnedHref && !mayLeave()) return;
        go(onCloseOthers(keep));
    };
    const runFromMenu = (action: () => void) => {
        closeMenu();
        action();
    };

    return (
        <div className="relative hidden border-b border-border bg-card/90 backdrop-blur-md md:block">
            <div ref={strip} role="tablist" aria-label={t('shell.tabs.label')}
                 className="flex items-end gap-0.5 overflow-x-auto px-3 pt-1.5 [scrollbar-width:thin] sm:px-5">
                {visible.map(tab => {
                    const {label, icon: Icon} = describe(tab.href)!;
                    const active = tab.href === activeHref;
                    const pinned = tab.href === pinnedHref;
                    const dirty = tab.href === dirtyHref && active;
                    return (
                        <div key={tab.href} role="presentation"
                             className={cn('group relative flex h-8 max-w-[220px] shrink-0 items-center rounded-t-lg border border-b-0 text-[12.5px] transition-colors',
                                 active
                                     ? 'border-border bg-background font-semibold text-slate-900 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-background before:absolute before:inset-x-2 before:top-0 before:h-0.5 before:rounded-full before:bg-primary'
                                     : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800')}
                             onAuxClick={event => {
                                 if (event.button === 1 && !pinned) {
                                     event.preventDefault();
                                     close(tab.href);
                                 }
                             }}
                             onContextMenu={event => {
                                 event.preventDefault();
                                 setMenuFor({href: tab.href, x: event.clientX, y: event.clientY});
                                 setMenuOpen(true);
                             }}>
                            <Link href={tab.path} role="tab" aria-selected={active} aria-current={active ? 'page' : undefined}
                                  title={label}
                                  onClick={event => {
                                      if (!active && !mayLeave()) event.preventDefault();
                                  }}
                                  className={cn('flex min-w-0 items-center gap-1.5 py-1 pl-3', pinned ? 'pr-3' : 'pr-1')}>
                                <Icon size={13} className={cn('shrink-0', active && 'text-primary')}/>
                                <span className="truncate">{label}</span>
                                {dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label={t('shell.tabs.unsaved')}/>}
                            </Link>
                            {!pinned && (
                                <button type="button" onClick={() => close(tab.href)}
                                        aria-label={t('shell.tabs.close', {page: label})} title={t('shell.tabs.close', {page: label})}
                                        className={cn('mr-1.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700',
                                            !active && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}>
                                    <X size={12}/>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            {menuOpen && menuFor && (
                <div ref={menuRoot} role="menu" aria-label={t('shell.tabs.label')}
                     style={{left: menuFor.x, top: menuFor.y}}
                     className="fixed z-50 min-w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
                    <button type="button" role="menuitem" className={menuItemClass} disabled={menuFor.href === pinnedHref}
                            onClick={() => runFromMenu(() => close(menuFor.href))}>
                        {t('shell.tabs.closeThis')}
                    </button>
                    <button type="button" role="menuitem" className={menuItemClass}
                            onClick={() => runFromMenu(() => closeOthers(menuFor.href))}>
                        {t('shell.tabs.closeOthers')}
                    </button>
                    <button type="button" role="menuitem" className={menuItemClass}
                            onClick={() => runFromMenu(() => closeOthers())}>
                        {t('shell.tabs.closeAll')}
                    </button>
                </div>
            )}
        </div>
    );
}
