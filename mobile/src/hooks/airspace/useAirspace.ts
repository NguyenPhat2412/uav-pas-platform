import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {toAirspaceCheckInput} from '@/shared/forms/airspace/airspace-zone-form';
import {airspaceKeys} from '@/shared/hooks/airspace/query-keys';
import type {Mission} from '@/shared/types/mission/mission.types';
import {airspaceService} from '@/api/airspace/airspace.api';
import {useAuth} from '@/providers/AuthContext';

export function useAirspaceZones(activeOnly = true) {
    const {user, status} = useAuth();
    return useQuery({
        queryKey: airspaceKeys.zones(user?.id, activeOnly),
        queryFn: ({signal}) => airspaceService.zones(activeOnly, signal),
        enabled: status === 'signed-in',
        staleTime: 60_000,
    });
}

export function useMissionAirspaceCheck(mission?: Pick<Mission, 'flightPlan' | 'latitude' | 'longitude'> | null) {
    const {user, status} = useAuth();
    const input = useMemo(
        () => (mission ? toAirspaceCheckInput(mission.flightPlan, mission.latitude, mission.longitude) : null),
        [mission],
    );
    return useQuery({
        queryKey: airspaceKeys.check(user?.id, input),
        queryFn: ({signal}) => airspaceService.check(input!, signal),
        enabled: status === 'signed-in' && input !== null,
        staleTime: 30_000,
    });
}
