'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, MoreHorizontal, X, type LucideIcon} from 'lucide-react';
import {useDropdownMenu} from '@/hooks/useDropdownMenu';
import {confirmDialog} from '@/providers/ConfirmContext';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import {
    MAX_VISIBLE_WORKSPACE_TABS,
    partitionWorkspaceTabs,
    type WorkspaceTab,
} from '@/lib/workspace-tabs';

interface TabLabel {
    label: string;
    icon: LucideIcon;
}

const menuItemClass = 'block w-full rounded-md px-3 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none disabled:opacity-40';

const edgeButton = 'absolute top-0 z-10 flex h-full w-9 items-center justify-center text-slate-500 hover:text-slate-900';

/**
 * The strip of open pages under the portal header: shows at most 6 tabs directly with full labels
 * (never truncating short labels) and places any extra tabs in a "…" overflow menu (UI-REVIEW-9-FIXES #6).
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
    const {open: listOpen, setOpen: setListOpen, close: closeList, root: listRoot, trigger: listTrigger} = useDropdownMenu();
    const [menuFor, setMenuFor] = useState<{ href: string; x: number; y: number } | null>(null);
    const [edges, setEdges] = useState({left: false, right: false});

    const known = tabs.filter(tab => describe(tab.href));
    const {primary, overflow} = partitionWorkspaceTabs(known, activeHref, pinnedHref, MAX_VISIBLE_WORKSPACE_TABS);

    useEffect(() => {
        const frame = requestAnimationFrame(() =>
            strip.current?.querySelector('[aria-current="page"]')?.scrollIntoView({block: 'nearest', inline: 'nearest'}));
        return () => cancelAnimationFrame(frame);
    }, [activeHref, primary.length]);

    useEffect(() => {
        const element = strip.current;
        if (!element) return;
        const measure = () => setEdges({
            left: element.scrollLeft > 1,
            right: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
        });
        const wheel = (event: WheelEvent) => {
            if (element.scrollWidth <= element.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
            event.preventDefault();
            element.scrollLeft += event.deltaY;
        };
        const observer = new ResizeObserver(() => {
            element.querySelector('[aria-current="page"]')?.scrollIntoView({block: 'nearest', inline: 'nearest'});
            measure();
        });
        observer.observe(element);
        Array.from(element.children).forEach(child => observer.observe(child));
        element.addEventListener('scroll', measure, {passive: true});
        element.addEventListener('wheel', wheel, {passive: false});
        measure();
        return () => {
            observer.disconnect();
            element.removeEventListener('scroll', measure);
            element.removeEventListener('wheel', wheel);
        };
    }, [primary.length]);

    const scrollBy = (direction: 1 | -1) => strip.current?.scrollBy({left: direction * 240, behavior: 'smooth'});

    const isActiveDirty = Boolean(activeHref && dirtyHref === activeHref);
    const mayLeave = async () => !isActiveDirty || await confirmDialog(t('shell.tabs.discardConfirm'));
    const go = (path?: string) => {
        if (path) router.push(path);
    };
    const close = async (href: string) => {
        if (href === activeHref && !(await mayLeave())) return;
        go(onClose(href));
    };
    const closeOthers = async (keep?: string) => {
        if (keep !== activeHref && activeHref !== pinnedHref && !(await mayLeave())) return;
        go(onCloseOthers(keep));
    };
    const runFromMenu = (action: () => void) => {
        closeMenu();
        action();
    };

    const navigateTab = (tab: WorkspaceTab, active: boolean) => {
        closeList();
        if (active) return;
        if (!isActiveDirty) {
            router.push(tab.path);
            return;
        }
        void confirmDialog(t('shell.tabs.discardConfirm')).then(ok => {
            if (ok) router.push(tab.path);
        });
    };

    const overflowAriaLabel = overflow.length > 0
        ? t('shell.tabs.moreTabs', {count: overflow.length})
        : t('shell.tabs.all');

    return (
        <div className="relative hidden items-end border-b border-border bg-card/90 pr-2 backdrop-blur-md md:flex">
            <div className="relative min-w-0 flex-1">
                {edges.left && (
                    <button type="button" onClick={() => scrollBy(-1)} aria-label={t('shell.tabs.scrollLeft')} title={t('shell.tabs.scrollLeft')}
                            className={cn(edgeButton, 'left-0 bg-gradient-to-r from-card via-card/95 to-transparent')}>
                        <ChevronLeft size={16}/>
                    </button>
                )}
                <div ref={strip} role="tablist" aria-label={t('shell.tabs.label')}
                     className="flex items-end gap-1 overflow-x-auto px-3 pt-1.5 [scroll-padding-inline:2.5rem] [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
                    {primary.map(tab => {
                        const {label, icon: Icon} = describe(tab.href)!;
                        const active = tab.href === activeHref;
                        const pinned = tab.href === pinnedHref;
                        const dirty = tab.href === dirtyHref && active;
                        return (
                            <div key={tab.href} role="presentation"
                                 className={cn(
                                     'group relative flex h-8 shrink-0 items-center rounded-t-lg border border-b-0 text-[12.5px] transition-colors',
                                     active
                                         ? 'border-border bg-background font-semibold text-slate-900 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-background before:absolute before:inset-x-2 before:top-0 before:h-0.5 before:rounded-full before:bg-primary'
                                         : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                                 )}
                                 onAuxClick={event => {
                                     if (event.button === 1 && !pinned) {
                                         event.preventDefault();
                                         void close(tab.href);
                                     }
                                 }}
                                 onContextMenu={event => {
                                     event.preventDefault();
                                     setMenuFor({
                                         href: tab.href,
                                         x: Math.max(8, Math.min(event.clientX, window.innerWidth - 208)),
                                         y: Math.max(8, Math.min(event.clientY, window.innerHeight - 160)),
                                     });
                                     setMenuOpen(true);
                                 }}>
                                <Link href={tab.path} role="tab" aria-selected={active} aria-current={active ? 'page' : undefined}
                                      title={label}
                                      onClick={event => {
                                          const needsConfirm = !active && dirtyHref === activeHref && Boolean(activeHref);
                                          if (needsConfirm) {
                                              event.preventDefault();
                                              void confirmDialog(t('shell.tabs.discardConfirm')).then(ok => {
                                                  if (ok) router.push(tab.path);
                                              });
                                          }
                                      }}
                                      className={cn('flex items-center gap-1.5 py-1 pl-3 whitespace-nowrap', pinned ? 'pr-3' : 'pr-1')}>
                                    <Icon size={13} className={cn('shrink-0', active && 'text-primary')} aria-hidden="true"/>
                                    <span className="whitespace-nowrap">{label}</span>
                                    {dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label={t('shell.tabs.unsaved')}/>}
                                </Link>
                                {!pinned && (
                                    <button type="button" onClick={() => void close(tab.href)}
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
                {edges.right && (
                    <button type="button" onClick={() => scrollBy(1)} aria-label={t('shell.tabs.scrollRight')} title={t('shell.tabs.scrollRight')}
                            className={cn(edgeButton, 'right-0 bg-gradient-to-l from-card via-card/95 to-transparent')}>
                        <ChevronRight size={16}/>
                    </button>
                )}
            </div>

            {(overflow.length > 0 || known.length > 1) && (
                <div ref={listRoot} className="relative mb-1 shrink-0 self-center">
                    <button ref={listTrigger} type="button" onClick={() => setListOpen(open => !open)}
                            aria-haspopup="menu" aria-expanded={listOpen} aria-label={overflowAriaLabel} title={overflowAriaLabel}
                            className={cn(
                                'inline-flex h-7 items-center gap-1 rounded-control px-2 text-xs font-semibold transition-colors cursor-pointer',
                                overflow.length > 0
                                    ? 'border border-border bg-surface-container-low text-slate-800 hover:border-slate-400'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                            )}>
                        <MoreHorizontal size={15} aria-hidden="true"/>
                        {overflow.length > 0 && <span className="tabular-nums">+{overflow.length}</span>}
                    </button>
                    {listOpen && (
                        <div role="menu" aria-label={t('shell.tabs.all')}
                             className="absolute right-0 top-full z-50 mt-1 max-h-[60vh] w-64 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
                            {(overflow.length > 0 ? overflow : known).map(tab => {
                                const {label, icon: Icon} = describe(tab.href)!;
                                const active = tab.href === activeHref;
                                const pinned = tab.href === pinnedHref;
                                return (
                                    <div key={tab.href} className="flex items-center gap-1">
                                        <button type="button" role="menuitem" aria-current={active ? 'page' : undefined}
                                                title={label}
                                                className={cn(menuItemClass, 'flex min-w-0 flex-1 items-center gap-2', active && 'font-semibold text-slate-900')}
                                                onClick={() => navigateTab(tab, active)}>
                                            <Icon size={14} className={cn('shrink-0', active ? 'text-primary' : 'text-slate-400')} aria-hidden="true"/>
                                            <span className="truncate">{label}</span>
                                        </button>
                                        {!pinned && (
                                            <button type="button"
                                                    onClick={() => void close(tab.href)}
                                                    aria-label={t('shell.tabs.close', {page: label})}
                                                    className="mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                                <X size={12}/>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {menuOpen && menuFor && (
                <div ref={menuRoot} role="menu" aria-label={t('shell.tabs.label')}
                     style={{left: menuFor.x, top: menuFor.y}}
                     className="fixed z-50 min-w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
                    <button type="button" role="menuitem" className={menuItemClass} disabled={menuFor.href === pinnedHref}
                            onClick={() => runFromMenu(() => void close(menuFor.href))}>
                        {t('shell.tabs.closeThis')}
                    </button>
                    <button type="button" role="menuitem" className={menuItemClass}
                            onClick={() => runFromMenu(() => void closeOthers(menuFor.href))}>
                        {t('shell.tabs.closeOthers')}
                    </button>
                    <button type="button" role="menuitem" className={menuItemClass}
                            onClick={() => runFromMenu(() => void closeOthers())}>
                        {t('shell.tabs.closeAll')}
                    </button>
                </div>
            )}
        </div>
    );
}
