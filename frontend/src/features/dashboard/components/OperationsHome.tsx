'use client';

import {Activity, MapPinned, PlaneTakeoff} from 'lucide-react';
import {PortalHomeColumn, PortalHomeHero, PortalHomeRow} from '@/components/layout/PortalHomeHero';
import {OPERATIONS_SIDEBAR_ROUTES} from '@/components/layout/sidebar-routes';
import {OPERATIONS_RECENT_PAGES_KEY} from '@/components/layout/recent-pages';
import {displayLabel} from '@/components/shared/presentation';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {useCollection} from '@/lib/query/operations';
import {toStationSlug, toUavSlug} from '@/lib/url-slugs';

/** Search-first header of the operations overview with 3 live operational columns. */
export function OperationsHome() {
    const {t} = useI18n();
    const {isAuthenticated, permissionsReady, can} = useAuth();
    const uavsQuery = useCollection('uavs', isAuthenticated && permissionsReady && can('UAV_READ'));
    const stationsQuery = useCollection('stations', isAuthenticated && permissionsReady && can('STATION_READ'));
    const uavs = (uavsQuery.data ?? []).slice(0, 4);
    const stations = (stationsQuery.data ?? []).slice(0, 4);

    return (
        <PortalHomeHero
            question={t('shell.home.operationsQuestion')}
            placeholder={t('shell.home.operationsSearch')}
            routes={OPERATIONS_SIDEBAR_ROUTES}
            recentKey={OPERATIONS_RECENT_PAGES_KEY}
            homeHref="/operations/overview"
            labelOf={item => t(`operationsNav.${item.key}`)}
            groupOf={item => t(`operationsNavGroups.${item.group}`)}
            recentTitle={t('admin.dashboard.home.recent')}
            recentEmpty={t('admin.dashboard.home.recentEmpty')}
        >
            <PortalHomeColumn
                title={t('opsMissions.overview.fleet.title')}
                count={uavsQuery.data?.length}
                href="/operations/uavs"
                empty={uavsQuery.isPending ? t('admin.dashboard.home.loading') : t('opsMissions.overview.fleet.empty')}
            >
                {uavs.map(uav => (
                    <PortalHomeRow
                        key={uav.id}
                        href={`/operations/uavs?uav=${toUavSlug(uav)}`}
                        icon={<PlaneTakeoff size={16} className="text-uav-blue"/>}
                        label={`${uav.model} · ${uav.serialNumber}`}
                        meta={displayLabel(uav.status)}
                    />
                ))}
            </PortalHomeColumn>

            <PortalHomeColumn
                title={t('opsMissions.overview.stations.title')}
                count={stationsQuery.data?.length}
                href="/operations/stations"
                empty={stationsQuery.isPending ? t('admin.dashboard.home.loading') : t('opsMissions.overview.fleet.unassigned')}
            >
                {stations.map(station => (
                    <PortalHomeRow
                        key={station.id}
                        href={`/operations/stations?station=${toStationSlug(station)}`}
                        icon={<MapPinned size={16} className="text-primary"/>}
                        label={`${station.code} · ${station.name}`}
                        meta={displayLabel(station.status)}
                    />
                ))}
            </PortalHomeColumn>
        </PortalHomeHero>
    );
}
