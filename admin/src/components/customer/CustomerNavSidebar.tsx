'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
    Bell as BellIcon,
    CircleHelp,
    LayoutDashboard,
    PanelLeftClose,
    PanelLeftOpen,
    Plane,
    ReceiptText,
    X,
    type LucideIcon,
} from 'lucide-react';
import {
    CollapsedNavFlyoutPortal,
    CollapsedNavGroupTrigger,
    useCollapsedNavFlyout,
} from '@/components/layout/CollapsedNavFlyout';
import {FoldingNavGroup, foldedLinkClass, useFoldedNavGroups} from '@/components/layout/FoldingNavGroup';
import {HeaderSearch} from '@/components/layout/HeaderSearch';
import {PortalSwitcher} from '@/components/layout/PortalSwitcher';
import {Badge, Button} from '@/components/ui';
import {LanguageSwitcher} from '@/components/ui/LanguageSwitcher';
import {CUSTOMER_SIDEBAR_GROUPS, type CUSTOMER_SIDEBAR_ROUTES} from '@/config/sidebar-routes';
import type {useSidebarController} from '@/hooks/useSidebarController';
import {useSidebarCounts} from '@/hooks/useSidebarCounts';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';

type CustomerRouteItem = (typeof CUSTOMER_SIDEBAR_ROUTES)[number];
type SidebarController = ReturnType<typeof useSidebarController>;

const GROUP_ICONS: Partial<Record<(typeof CUSTOMER_SIDEBAR_GROUPS)[number], LucideIcon>> = {
    overview: LayoutDashboard,
    missions: Plane,
    services: ReceiptText,
    support: CircleHelp,
};

const badgeText = (value: number) => (value > 99 ? '99+' : String(value));

export interface CustomerNavSidebarProps {
    sidebar: Pick<
        SidebarController,
        'open' | 'setOpen' | 'railCollapsed' | 'peeking' | 'peekProps' | 'toggleCollapsed' | 'shortcut' | 'rail' | 'navList'
    >;
    visibleNav: CustomerRouteItem[];
    activeNav?: CustomerRouteItem;
    searchItems: { href: string; label: string; group: string }[];
}

export function CustomerNavSidebar({
    sidebar,
    visibleNav,
    activeNav,
    searchItems,
}: CustomerNavSidebarProps) {
    const {t} = useI18n();
    const counts = useSidebarCounts();
    const {open, setOpen, railCollapsed, toggleCollapsed, shortcut, rail, navList} = sidebar;
    const {openGroups, toggleGroup} = useFoldedNavGroups('uav_customer_nav_open_groups', activeNav?.group);
    const flyout = useCollapsedNavFlyout(railCollapsed);

    const renderBadge = (count: number, compact: boolean) =>
        count > 0 ? (
            <Badge
                variant="primary"
                size="sm"
                aria-hidden="true"
                className={
                    compact
                        ? 'absolute -top-1 -right-1 min-w-4 justify-center border-0 bg-primary px-1 py-0 text-[9.5px] leading-4 text-primary-foreground'
                        : 'min-w-5 justify-center border-0 bg-primary px-1.5 py-0 text-[11px] leading-5 text-primary-foreground tabular-nums'
                }
            >
                {badgeText(count)}
            </Badge>
        ) : null;

    const brandLabel = `UAV PAS · ${t('shell.customerTitle')}`;
    const toggleLabel = `${railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')} (${shortcut})`;

    return (
        <>
            <aside
                ref={rail}
                id="customer-navigation"
                className={cn(
                    'fixed inset-y-0 left-0 z-[60] flex flex-col border-r border-border bg-card px-2.5 py-2.5 transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:z-40 lg:h-screen',
                    railCollapsed ? 'w-[60px]' : 'w-[min(280px,85vw)] lg:w-[220px]',
                    open ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
                )}
            >
                <div className={cn('mb-2 flex items-center border-b border-slate-100 pb-2', railCollapsed ? 'flex-col justify-center gap-1.5' : 'justify-between gap-1.5')}>
                    <Link
                        href="/customer/dashboard"
                        className={cn('flex min-w-0 items-center gap-2 text-foreground', railCollapsed && 'justify-center')}
                        onClick={() => setOpen(false)}
                        aria-label="UAV PAS"
                        title={railCollapsed ? undefined : brandLabel}
                        {...flyout.tooltipTriggerProps('customer-brand', brandLabel)}
                    >
                        <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-rose-100 bg-white p-0.5 shadow-xs">
                            <Image src="/uav-pas-logo.svg" alt={t('shell.brandName')} width={26} height={26} className="h-[26px] w-[26px] object-contain"/>
                        </span>
                        {!railCollapsed && (
                            <span className="flex flex-col truncate leading-tight">
                                <strong className="truncate text-[13.5px] font-bold text-slate-800">UAV PAS</strong>
                                <small className="truncate text-[10.5px] font-medium text-slate-500">{t('shell.customerTitle')}</small>
                            </span>
                        )}
                    </Link>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="hidden h-7 w-7 shrink-0 rounded-lg border-[#ab2523]/20 bg-[#ab2523]/5 p-0 text-[#ab2523] hover:border-[#ab2523]/40 hover:bg-[#ab2523]/12 hover:text-[#ab2523] lg:inline-flex"
                        onClick={toggleCollapsed}
                        aria-label={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
                        aria-keyshortcuts="Control+B Meta+B"
                        title={railCollapsed ? undefined : toggleLabel}
                        {...flyout.tooltipTriggerProps('customer-toggle', toggleLabel)}
                    >
                        {railCollapsed ? <PanelLeftOpen size={14}/> : <PanelLeftClose size={14}/>}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rail-close inline-flex h-8 w-8 shrink-0 rounded-lg border-border p-0 text-slate-600 hover:bg-slate-100 lg:hidden"
                        aria-label={t('shell.closeNavigation')}
                        onClick={() => setOpen(false)}
                    >
                        <X size={16}/>
                    </Button>
                </div>
                <div className="mb-2 space-y-2 border-b border-slate-100 pb-2.5 md:hidden">
                    <PortalSwitcher currentPortal="customer" variant="drawer"/>
                    <HeaderSearch variant="drawer" items={searchItems}/>
                    <LanguageSwitcher variant="compact" className="sm:hidden"/>
                </div>
                <nav ref={navList} aria-label={t('shell.customerSection')} className={cn('flex flex-1 flex-col overflow-y-auto', railCollapsed ? 'gap-1.5 py-0.5' : 'gap-0.5')}>
                    {CUSTOMER_SIDEBAR_GROUPS.map(group => {
                        const items = visibleNav.filter(item => item.group === group);
                        if (!items.length) return null;
                        const GroupIcon = GROUP_ICONS[group] ?? BellIcon;
                        const groupLabel = t(`nav.groups.${group}`);
                        const groupActive = items.some(item => item.href === activeNav?.href);
                        if (railCollapsed) {
                            const groupBadgeTotal = items.reduce((sum, item) => sum + (item.badge ? counts[item.badge] : 0), 0);
                            return (
                                <CollapsedNavGroupTrigger
                                    key={group}
                                    id={`customer-flyout-${group}`}
                                    label={groupLabel}
                                    icon={GroupIcon}
                                    active={groupActive}
                                    controller={flyout}
                                    onNavigate={() => setOpen(false)}
                                    badge={renderBadge(groupBadgeTotal, true)}
                                    items={items.map(({href, key, defaultLabel, badge}) => {
                                        const translated = t(`nav.${key}`);
                                        const label = (translated && translated !== `nav.${key}` ? translated : defaultLabel) || key;
                                        const active = href === activeNav?.href;
                                        const count = badge ? counts[badge] : 0;
                                        const accessibleLabel = count ? t(`nav.badges.${badge}`, {label, count}) : label;
                                        return {
                                            href,
                                            label,
                                            active,
                                            accessibleLabel,
                                            badge: renderBadge(count, false),
                                        };
                                    })}
                                />
                            );
                        }
                        return (
                            <FoldingNavGroup
                                key={group}
                                id={`customer-nav-${group}`}
                                label={groupLabel}
                                icon={GroupIcon}
                                expanded={!!openGroups[group]}
                                active={groupActive}
                                onToggle={() => toggleGroup(group)}
                            >
                                {items.map(({href, key, defaultLabel, badge}) => {
                                    const translated = t(`nav.${key}`);
                                    const label = (translated && translated !== `nav.${key}` ? translated : defaultLabel) || key;
                                    const active = href === activeNav?.href;
                                    const count = badge ? counts[badge] : 0;
                                    const accessibleLabel = count ? t(`nav.badges.${badge}`, {label, count}) : label;
                                    return (
                                        <li key={href}>
                                            <Link
                                                href={href}
                                                aria-current={active ? 'page' : undefined}
                                                aria-label={accessibleLabel}
                                                title={label}
                                                onClick={() => setOpen(false)}
                                                className={cn(foldedLinkClass(active), 'flex items-center justify-between gap-2')}
                                            >
                                                <span className="truncate">{label}</span>
                                                {renderBadge(count, false)}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </FoldingNavGroup>
                        );
                    })}
                </nav>
                <CollapsedNavFlyoutPortal controller={flyout} onNavigate={() => setOpen(false)}/>
            </aside>
            {open && (
                <Button
                    type="button"
                    variant="ghost"
                    className="fixed inset-0 z-[55] h-auto w-auto rounded-none bg-slate-900/40 p-0 backdrop-blur-xs hover:bg-slate-900/40 lg:hidden"
                    aria-label={t('shell.closeNavigation')}
                    onClick={() => setOpen(false)}
                />
            )}
        </>
    );
}
