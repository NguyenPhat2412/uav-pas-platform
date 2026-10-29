'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import {ChevronRight, History} from 'lucide-react';
import type {SidebarRouteItem} from '@/types/ui';
import {HeaderSearch} from '@/components/layout/HeaderSearch';
import {readRecentPages} from '@/components/layout/recent-pages';
import {useAuth} from '@/contexts/AuthContext';
import {cn} from '@/lib/utils';

const LIST_SIZE = 5;

/**
 * Portal home header in the spirit of a cloud console: one question and a large page search whose
 * empty state lists the pages this browser opened last, followed by an optional 3-column live strip.
 */
export function PortalHomeHero<G extends string>({
    question,
    placeholder,
    routes,
    recentKey,
    homeHref,
    labelOf,
    groupOf,
    recentTitle,
    recentEmpty,
    children,
}: {
    question: string;
    placeholder: string;
    routes: readonly SidebarRouteItem<G>[];
    recentKey: string;
    homeHref: string;
    labelOf: (item: SidebarRouteItem<G>) => string;
    groupOf: (item: SidebarRouteItem<G>) => string;
    recentTitle?: string;
    recentEmpty?: string;
    children?: ReactNode;
}) {
    const {can, permissionsReady} = useAuth();
    const [recent, setRecent] = useState<string[]>([]);
    useEffect(() => {
        // Read after mount: the list lives in this browser's storage, which the server cannot see.
        setRecent(readRecentPages(recentKey).filter(href => href !== homeHref));
    }, [recentKey, homeHref]);

    const allowed = useMemo(
        () => routes.filter(item => !item.permission || (permissionsReady && can(item.permission))),
        [routes, can, permissionsReady],
    );
    const toItem = (item: SidebarRouteItem<G>) => {
        const Icon = item.icon;
        return {href: item.href, label: labelOf(item), group: groupOf(item), icon: <Icon size={16}/>};
    };
    const byHref = new Map(allowed.map(item => [item.href, item]));
    const recentRoutes = recent.map(href => byHref.get(href)).filter(item => item !== undefined).slice(0, LIST_SIZE);
    const recentItems = recentRoutes.map(toItem);

    return (
        <div className="space-y-8 pb-2">
            <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 pt-4 text-center sm:pt-8">
                <h1 className="m-0 text-[26px] font-semibold tracking-tight text-foreground sm:text-[32px]">{question}</h1>
                <div className="w-full text-left">
                    <HeaderSearch variant="hero" items={allowed.map(toItem)} recent={recentItems} placeholder={placeholder}/>
                </div>
            </section>

            {(children || recentTitle) && (
                <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
                    {children}
                    {recentTitle && (
                        <PortalHomeColumn title={recentTitle} empty={recentEmpty ?? '—'}>
                            {recentRoutes.map(item => (
                                <PortalHomeRow
                                    key={item.href}
                                    href={item.href}
                                    icon={<History size={16} className="text-slate-400"/>}
                                    label={
                                        <>
                                            <span className="text-muted">{groupOf(item)} / </span>
                                            {labelOf(item)}
                                        </>
                                    }
                                />
                            ))}
                        </PortalHomeColumn>
                    )}
                </div>
            )}
        </div>
    );
}

export function PortalHomeColumn({title, count, href, empty, children}: {
    title: string;
    count?: number;
    href?: string;
    empty: string;
    children: ReactNode[];
}) {
    const heading = (
        <>
            {title}
            {count !== undefined && (
                <span className="rounded-badge bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                    {count}
                </span>
            )}
            {href && <ChevronRight size={14} aria-hidden="true"/>}
        </>
    );
    return (
        <section className="min-w-0">
            <h2 className="m-0 mb-1 text-sm font-medium text-muted">
                {href ? (
                    <Link href={href} className="inline-flex items-center gap-2 hover:text-primary">
                        {heading}
                    </Link>
                ) : (
                    <span className="inline-flex items-center gap-2">{heading}</span>
                )}
            </h2>
            {children.length ? (
                <ul className="m-0 list-none p-0">{children}</ul>
            ) : (
                <p className="m-0 border-b border-border py-4 text-sm text-muted">{empty}</p>
            )}
        </section>
    );
}

export function PortalHomeRow({href, icon, label, meta}: {
    href: string;
    icon: ReactNode;
    label: ReactNode;
    meta?: string;
}) {
    return (
        <li className="border-b border-border">
            <Link
                href={href}
                className={cn('group flex items-center gap-3 py-3 text-[14.5px] text-foreground transition-colors hover:text-primary')}
            >
                <span className="shrink-0" aria-hidden="true">
                    {icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {meta && <span className="shrink-0 text-xs tabular-nums text-muted">{meta}</span>}
                <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-slate-300 transition-colors group-hover:text-primary"/>
            </Link>
        </li>
    );
}
