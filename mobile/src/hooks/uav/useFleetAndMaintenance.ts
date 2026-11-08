import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import type {FleetMap, UavStatus} from '@/shared/types/uav/fleet-map.types';
import type {UavTelemetry} from '@/shared/types/uav/telemetry.types';
import {fleetService} from '@/api/uav/fleet.api';
import {useAuth} from '@/providers/AuthContext';

const FLEET_TELEMETRY_POLL_MS = 10_000;

export function useFleetOverview() {
    const {user, can, permissionsReady} = useAuth();
    const key = queryKeys.feature(user?.id, 'fleet');
    const canViewFleetMap = can('MISSION_VIEW_ALL');
    const canViewAssets = can('UAV_VIEW') || can('STATION_VIEW') || canViewFleetMap;

    const overview = useQuery({
        queryKey: [...key, 'overview', {canViewFleetMap}],
        queryFn: async ({signal}): Promise<FleetMap> => {
            if (canViewFleetMap) {
                return fleetService.fleetMap(signal);
            }
            const [uavPage, stationPage] = await Promise.all([
                can('UAV_VIEW') ? fleetService.uavs(signal) : Promise.resolve({content: []}),
                can('STATION_VIEW') ? fleetService.stations(signal) : Promise.resolve({content: []}),
            ]);
            const uavCountByStation = new Map<number, number>();
            for (const uav of uavPage.content) {
                if (uav.stationId != null) {
                    uavCountByStation.set(uav.stationId, (uavCountByStation.get(uav.stationId) ?? 0) + 1);
                }
            }
            return {
                uavs: uavPage.content.map(uav => ({
                    id: uav.id,
                    model: uav.model,
                    serialNumber: uav.serialNumber,
                    manufacturer: uav.manufacturer ?? null,
                    status: uav.status as UavStatus,
                    stationId: uav.stationId ?? null,
                    stationName: uav.stationName ?? null,
                    lastMaintenanceAt: null,
                    positionSource: uav.stationId != null ? 'STATION' : 'NONE',
                    latitude: null,
                    longitude: null,
                    activeMission: null,
                })),
                stations: stationPage.content.map(station => ({
                    id: station.id,
                    code: station.code,
                    name: station.name,
                    latitude: station.latitude ?? null,
                    longitude: station.longitude ?? null,
                    status: station.status ?? null,
                    uavCount: uavCountByStation.get(station.id) ?? 0,
                })),
                generatedAt: new Date().toISOString(),
            };
        },
        enabled: permissionsReady && canViewAssets,
    });

    const telemetry = useQuery({
        queryKey: [...key, 'telemetry'],
        queryFn: ({signal}) => fleetService.fleetTelemetry(signal),
        enabled: permissionsReady && can('UAV_VIEW'),
        refetchInterval: FLEET_TELEMETRY_POLL_MS,
    });

    const telemetryByUavId = useMemo(() => {
        const map = new Map<number, UavTelemetry>();
        for (const sample of telemetry.data ?? []) {
            map.set(sample.uavId, sample);
        }
        return map;
    }, [telemetry.data]);

    return {overview, telemetry, telemetryByUavId};
}

export function useUavHealthAnalytics() {
    const {user, can, permissionsReady} = useAuth();
    const key = queryKeys.feature(user?.id, 'fleet');
    return useQuery({
        queryKey: [...key, 'health-analytics'],
        queryFn: ({signal}) => fleetService.healthAnalytics(signal),
        enabled: permissionsReady && can('UAV_VIEW'),
        staleTime: 30_000,
    });
}

export function useMaintenanceOrders(status = '') {
    const {user, can, permissionsReady} = useAuth();
    const key = queryKeys.feature(user?.id, 'maintenance');
    return useQuery({
        queryKey: [...key, 'orders', {status}],
        queryFn: ({signal}) => fleetService.orders(0, status, signal),
        enabled: permissionsReady && can('UAV_MAINTENANCE_VIEW'),
    });
}

export function useMaintenanceOrderActions() {
    const {user} = useAuth();
    const client = useQueryClient();
    const maintenanceKey = queryKeys.feature(user?.id, 'maintenance');
    const fleetKey = queryKeys.feature(user?.id, 'fleet');

    const refresh = () => Promise.all([
        client.invalidateQueries({queryKey: maintenanceKey}),
        client.invalidateQueries({queryKey: fleetKey}),
    ]);

    const startOrder = useMutation({
        mutationFn: ({orderId, expectedVersion}: { orderId: number; expectedVersion: number }) =>
            fleetService.startOrder(orderId, expectedVersion),
        onSuccess: refresh,
        retry: false,
    });

    const completeOrder = useMutation({
        mutationFn: ({
            orderId,
            expectedVersion,
            inspectionNotes,
            inspectionPassed,
        }: {
            orderId: number;
            expectedVersion: number;
            inspectionNotes: string;
            inspectionPassed: boolean;
        }) => fleetService.completeOrder(orderId, expectedVersion, inspectionNotes, inspectionPassed),
        onSuccess: refresh,
        retry: false,
    });

    return {startOrder, completeOrder};
}
