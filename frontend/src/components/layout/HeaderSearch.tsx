'use client';

import {useRouter} from 'next/navigation';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {ArrowDown, ArrowRight, ArrowUp, CornerDownLeft, Search} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';

export interface HeaderSearchItem {
    href: string;
    label: string;
    group?: string;
    icon?: ReactNode;
}

/** Lower-case and strip Vietnamese diacritics so "hoa don" finds "Hóa đơn". */
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const MAX_RESULTS = 8;

/**
 * Header search that jumps to a page of the current portal. It only searches the sidebar items the
 * user is allowed to see, so every portal offers the same shortcut (Ctrl/⌘ + K) over its own pages.
 */
export function HeaderSearch({items, variant = 'header', placeholder, recent = []}: {
    items: HeaderSearchItem[];
    /** Hero only: pages shown as "Recents" when the box is focused and still empty. */
    recent?: HeaderSearchItem[];
    /** header: compact box in the top bar (owns Ctrl/⌘ + K); drawer: the mobile menu; hero: a large box on a page. */
    variant?: 'header' | 'drawer' | 'hero';
    placeholder?: string;
}) {
    const inDrawer = variant === 'drawer';
    const inHero = variant === 'hero';
    const {t} = useI18n();
    const router = useRouter();
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    const results = useMemo(() => {
        const needle = fold(query.trim());
        if (!needle) return [];
        return items.filter(item => fold(`${item.label} ${item.group ?? ''}`).includes(needle)).slice(0, MAX_RESULTS);
    }, [items, query]);

    useEffect(() => {
        if (inDrawer) return;
        const onKey = (event: KeyboardEvent) => {
            // A page-level hero search takes the shortcut while it is on screen.
            if (!inHero && document.querySelector('[data-hero-search]')) return;
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [inDrawer, inHero]);

    const go = (item: HeaderSearchItem) => {
        setQuery('');
        setOpen(false);
        inputRef.current?.blur();
        router.push(item.href);
    };

    const typing = query.trim().length > 0;
    // The hero box opens on focus with the recent pages; the compact boxes open once the user types.
    const list = typing ? results : (inHero ? recent : []);
    const showList = open && (typing || list.length > 0);

    return (
        <div data-hero-search={inHero ? '' : undefined} className={inHero ? 'relative w-full p-1.5' : inDrawer ? 'relative md:hidden' : 'relative hidden shrink-0 md:block'}>
            {/* Hero: a white field inside a soft grey frame, as on cloud consoles. */}
            <label className={inHero
                ? 'flex h-12 w-full items-center gap-3 rounded-[10px] border border-slate-200 bg-white px-4 text-slate-400 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_2px_8px_rgb(0_0_0/0.04)] outline-offset-0 ring-[6px] ring-slate-100 focus-within:border-slate-300 focus-within:ring-slate-200/80'
                : `flex h-9 items-center gap-2 rounded-control border border-border-input bg-card px-2.5 text-muted focus-within:outline-2 focus-within:outline-primary ${inDrawer ? 'w-full' : 'w-40 xl:w-56 2xl:w-64'}`}>
                <Search size={inHero ? 18 : 15} aria-hidden="true"/>
                <span className="sr-only">{t('shell.search.label')}</span>
                <input
                    ref={inputRef}
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={showList && list[active] ? `${listId}-${active}` : undefined}
                    className={`h-8 w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-slate-400 ${inHero ? 'text-base' : 'text-sm'}`}
                    placeholder={placeholder ?? t('shell.search.placeholder')}
                    value={query}
                    onChange={event => {
                        setQuery(event.target.value);
                        setActive(0);
                        setOpen(true);
                    }}
                    onFocus={() => {
                        setActive(0);
                        setOpen(true);
                    }}
                    onBlur={() => setOpen(false)}
                    onKeyDown={event => {
                        if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            setActive(index => Math.min(index + 1, Math.max(list.length - 1, 0)));
                        } else if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            setActive(index => Math.max(index - 1, 0));
                        } else if (event.key === 'Enter' && list[active]) {
                            event.preventDefault();
                            go(list[active]);
                        } else if (event.key === 'Escape') {
                            setQuery('');
                            setOpen(false);
                        }
                    }}
                />
                {variant === 'header' && <kbd className="hidden rounded border border-border px-1 text-[10px] font-semibold text-slate-400 xl:inline">⌘K</kbd>}
                {inHero && <span className="hidden shrink-0 items-center gap-1 sm:inline-flex" aria-hidden="true">
                    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 text-xs font-medium text-slate-600">⌘</kbd>
                    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 text-xs font-medium text-slate-600">K</kbd>
                </span>}
            </label>
            {showList && !inHero && (
                <ul id={listId} role="listbox" className={`absolute top-full z-40 mt-1.5 overflow-hidden rounded-panel border border-border bg-card py-1 shadow-lg ${inDrawer ? 'inset-x-0' : 'right-0 w-72'}`}>
                    {list.length ? list.map((item, index) => (
                        <li
                            key={item.href}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === active}
                            className={`flex cursor-pointer flex-col px-3 py-2 text-sm ${index === active ? 'bg-uav-red-light text-primary' : 'text-foreground hover:bg-slate-50'}`}
                            onMouseDown={event => {
                                event.preventDefault();
                                go(item);
                            }}
                            onMouseEnter={() => setActive(index)}
                        >
                            <span className="font-semibold">{item.label}</span>
                            {item.group && <span className="text-[11px] text-muted">{item.group}</span>}
                        </li>
                    )) : (
                        <li className="px-3 py-2 text-sm text-muted">{t('shell.search.empty')}</li>
                    )}
                </ul>
            )}
            {/* Hero panel: a titled list (recent pages, or matches) with a keyboard hint footer. */}
            {showList && inHero && (
                <div className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-overlay border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0_0_0/0.08)]">
                    <p className="m-0 px-5 pb-1 pt-4 text-[13px] font-medium text-muted">{typing ? t('shell.search.results') : t('shell.search.recent')}</p>
                    <ul id={listId} role="listbox" className="m-0 max-h-[360px] list-none overflow-y-auto px-2 pb-2">
                        {list.length ? list.map((item, index) => (
                            <li
                                key={item.href}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={index === active}
                                className={`flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-[15px] ${index === active ? 'bg-slate-50' : ''}`}
                                onMouseDown={event => {
                                    event.preventDefault();
                                    go(item);
                                }}
                                onMouseEnter={() => setActive(index)}
                            >
                                <span className="inline-flex w-5 shrink-0 justify-center text-slate-500" aria-hidden="true">{item.icon ?? <Search size={16}/>}</span>
                                <span className="min-w-0 flex-1 truncate text-foreground">
                                    {item.label}
                                    {item.group && <span className="text-muted"> <span aria-hidden="true">—</span> {item.group}</span>}
                                </span>
                                {index === active && <ArrowRight size={16} className="shrink-0 text-slate-400" aria-hidden="true"/>}
                            </li>
                        )) : (
                            <li className="px-3 py-2.5 text-sm text-muted">{t('shell.search.empty')}</li>
                        )}
                    </ul>
                    <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-[13px] text-muted" aria-hidden="true">
                        <span className="inline-flex items-center gap-1.5">
                            <kbd className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white"><ArrowUp size={13}/></kbd>
                            <kbd className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white"><ArrowDown size={13}/></kbd>
                            {t('shell.search.navigate')}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <kbd className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white"><CornerDownLeft size={13}/></kbd>
                            {t('shell.search.select')}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
