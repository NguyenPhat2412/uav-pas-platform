'use client';

import {CalendarClock, ClipboardList} from 'lucide-react';
import {PortalHomeColumn, PortalHomeHero, PortalHomeRow} from '@/components/layout/PortalHomeHero';
import {CUSTOMER_SIDEBAR_ROUTES} from '@/config/sidebar-routes';
import {CUSTOMER_RECENT_PAGES_KEY} from '@/lib/recent-pages';
import {displayLabel} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import {useCustomerAnalytics} from '@/hooks/dashboard/useCustomerAnalytics';
import {useMissions} from '@/hooks/mission/useCustomerMissions';
import {formatShortDate} from '@/lib/format';
import {toMissionSlug} from '@/lib/url-slugs';

/** Search-first header of the customer dashboard with 3 live customer columns. */
export function CustomerHome() {
    const {t, formatDate} = useI18n();
    const missionsQuery = useMissions();
    const analyticsQuery = useCustomerAnalytics();
    const missions = (missionsQuery.data?.content ?? []).slice(0, 4);
    const upcoming = (analyticsQuery.data?.upcoming ?? []).slice(0, 4);

    return (
        <PortalHomeHero
            question={t('shell.home.customerQuestion')}
            placeholder={t('shell.home.customerSearch')}
            routes={CUSTOMER_SIDEBAR_ROUTES}
            recentKey={CUSTOMER_RECENT_PAGES_KEY}
            homeHref="/customer/dashboard"
            labelOf={item => t(`nav.${item.key}`) || item.defaultLabel || item.key}
            groupOf={item => t(`nav.groups.${item.group}`)}
            recentTitle={t('admin.dashboard.home.recent')}
            recentEmpty={t('admin.dashboard.home.recentEmpty')}
        >
            <PortalHomeColumn
                title={t('dashboard.recentMissions')}
                count={missionsQuery.data?.totalElements}
                href="/customer/missions"
                empty={missionsQuery.isPending ? t('dashboard.loadingMissions') : t('dashboard.noMissions')}
            >
                {missions.map(mission => (
                    <PortalHomeRow
                        key={mission.id}
                        href={`/customer/missions/${toMissionSlug(mission)}`}
                        icon={<ClipboardList size={16} className="text-uav-blue"/>}
                        label={`${mission.code} · ${mission.title}`}
                        meta={displayLabel(mission.status)}
                    />
                ))}
            </PortalHomeColumn>

            <PortalHomeColumn
                title={t('dashboard.analytics.upcomingTitle')}
                count={analyticsQuery.data?.upcoming.length}
                href="/customer/missions"
                empty={analyticsQuery.isPending ? t('dashboard.loadingMissions') : t('dashboard.analytics.noUpcoming')}
            >
                {upcoming.map(item => (
                    <PortalHomeRow
                        key={item.id}
                        href={`/customer/missions/${item.id}`}
                        icon={<CalendarClock size={16} className="text-primary"/>}
                        label={`${item.code} · ${item.title}`}
                        meta={formatShortDate(item.startTime, formatDate)}
                    />
                ))}
            </PortalHomeColumn>
        </PortalHomeHero>
    );
}
