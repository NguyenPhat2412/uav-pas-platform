'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';
import {stationsService} from '@/features/stations/api/stations.api';
import {useOperationMutation} from '@/hooks/useOperationMutation';

export function useStations(page = 0, size = 20) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: [...queryKeys.list(user?.id, 'stations', page), size],
        queryFn: ({signal}) => stationsService.listStations(page, size, signal),
        enabled: can('STATION_READ')
    });
}

export function useStation(id?: number) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.detail(user?.id, 'stations', id),
        queryFn: ({signal}) => stationsService.station(id!, signal),
        enabled: !!id && can('STATION_READ')
    });
}

type StationFields = { code: string; name: string; address?: string; latitude?: number; longitude?: number };

/** Station writes refresh stations, the dashboard counts and the audit trail. */
export function useStationMutations() {
    return {
        create: useOperationMutation(stationsService.createStation, ['stations', 'dashboard', 'audit']),
        update: useOperationMutation(({id, data}: { id: number; data: StationFields }) => stationsService.updateStation(id, data),
            ['stations', 'dashboard', 'audit']),
    };
}
