'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {ChevronDown, ChevronLeft, ChevronRight, X, type LucideIcon} from 'lucide-react';
import {useDropdownMenu} from '@/hooks/useDropdownMenu';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import type {WorkspaceTab} from '@/lib/workspace-tabs';

interface TabLabel {
    label: string;
    icon: LucideIcon;
}

const menuItemClass = 'block w-full rounded-md px-3 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none disabled:opacity-40';

const edgeButton = 'absolute top-0 z-10 flex h-full w-9 items-center justify-center text-slate-500 hover:text-slate-900';

/**
 * The strip of open pages under the portal header, like browser tabs: click to switch, × or a middle
 * click to close, right click for "close others / close all". A dot marks the page with unsaved input,
 * and leaving or closing that page asks first. Hidden below md, where the sidebar drawer is enough.
 * Tabs shrink before they overflow; past that, ‹ › buttons and the mouse wheel scroll the strip and the
 * "all tabs" menu reaches any tab directly, so none is ever stuck out of reach.
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
    const visible = tabs.filter(tab => describe(tab.href));

    // Bring the open tab into view (clear of the ‹ › buttons via scroll-padding) once the tabs have shrunk.
    useEffect(() => {
        const frame = requestAnimationFrame(() =>
            strip.current?.querySelector('[aria-current="page"]')?.scrollIntoView({block: 'nearest', inline: 'nearest'}));
        return () => cancelAnimationFrame(frame);
    }, [activeHref, tabs.length]);

    // Which ends have hidden tabs; re-measured on scroll and whenever the strip or its tabs resize.
    useEffect(() => {
        const element = strip.current;
        if (!element) return;
        const measure = () => setEdges({
            left: element.scrollLeft > 1,
            right: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
        });
        // A vertical wheel over the strip scrolls it sideways, as in a browser tab bar.
        const wheel = (event: WheelEvent) => {
            if (element.scrollWidth <= element.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
            event.preventDefault();
            element.scrollLeft += event.deltaY;
        };
        // A resize (sidebar toggled, window narrowed) can push the open tab under an edge button.
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
    }, [visible.length]);

    const scrollBy = (direction: 1 | -1) => strip.current?.scrollBy({left: direction * 240, behavior: 'smooth'});

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
        <div className="relative hidden items-end border-b border-border bg-card/90 pr-1 backdrop-blur-md md:flex">
            <div className="relative min-w-0 flex-1">
            {edges.left && (
                <button type="button" onClick={() => scrollBy(-1)} aria-label={t('shell.tabs.scrollLeft')} title={t('shell.tabs.scrollLeft')}
                        className={cn(edgeButton, 'left-0 bg-gradient-to-r from-card via-card/95 to-transparent')}>
                    <ChevronLeft size={16}/>
                </button>
            )}
            <div ref={strip} role="tablist" aria-label={t('shell.tabs.label')}
                 className="flex items-end gap-0.5 overflow-x-auto px-3 pt-1.5 [scroll-padding-inline:2.5rem] [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
                {visible.map(tab => {
                    const {label, icon: Icon} = describe(tab.href)!;
                    const active = tab.href === activeHref;
                    const pinned = tab.href === pinnedHref;
                    const dirty = tab.href === dirtyHref && active;
                    return (
                        <div key={tab.href} role="presentation"
                             className={cn('group relative flex h-8 max-w-[220px] items-center rounded-t-lg border border-b-0 text-[12.5px] transition-colors',
                                 // Background tabs give up width first (down to icon + a few letters); the open one never does.
                                 active || pinned ? 'shrink-0' : 'min-w-[6.5rem] shrink',
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
            {edges.right && (
                <button type="button" onClick={() => scrollBy(1)} aria-label={t('shell.tabs.scrollRight')} title={t('shell.tabs.scrollRight')}
                        className={cn(edgeButton, 'right-0 bg-gradient-to-l from-card via-card/95 to-transparent')}>
                    <ChevronRight size={16}/>
                </button>
            )}
            </div>
            <div ref={listRoot} className="relative mb-1 shrink-0 self-center">
                <button ref={listTrigger} type="button" onClick={() => setListOpen(open => !open)}
                        aria-haspopup="menu" aria-expanded={listOpen} aria-label={t('shell.tabs.all')} title={t('shell.tabs.all')}
                        className="inline-flex h-7 items-center gap-1 rounded-control px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                    <span className="tabular-nums">{visible.length}</span><ChevronDown size={14}/>
                </button>
                {listOpen && (
                    <div role="menu" aria-label={t('shell.tabs.all')}
                         className="absolute right-0 top-full z-50 mt-1 max-h-[60vh] w-64 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
                        {visible.map(tab => {
                            const {label, icon: Icon} = describe(tab.href)!;
                            const active = tab.href === activeHref;
                            return <button key={tab.href} type="button" role="menuitem" aria-current={active ? 'page' : undefined}
                                           className={cn(menuItemClass, 'flex items-center gap-2', active && 'font-semibold text-slate-900')}
                                           onClick={() => {
                                               closeList();
                                               if (!active && mayLeave()) router.push(tab.path);
                                           }}>
                                <Icon size={14} className={cn('shrink-0', active ? 'text-primary' : 'text-slate-400')}/>
                                <span className="truncate">{label}</span>
                            </button>;
                        })}
                    </div>
                )}
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
