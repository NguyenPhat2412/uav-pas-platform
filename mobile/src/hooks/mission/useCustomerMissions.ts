import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import {customerMissionService} from '@/api/mission/customer-missions.api';
import {useAuth} from '@/providers/AuthContext';
import type {MissionInput, MissionStatus} from '@/shared/types/customer';
import type {MissionPermitUpsertInput} from '@/shared/types/mission/mission.types';

/** Same cache keys as the web customer portal: ['session', userId, 'customer', ...]. */
function useCustomerKey() {
    const auth = useAuth();
    return {...auth, key: queryKeys.feature(auth.user?.id, 'customer')};
}

export function useServices() {
    const {key, can, permissionsReady} = useCustomerKey();
    return useQuery({
        queryKey: [...key, 'services'],
        queryFn: ({signal}) => customerMissionService.services(signal),
        enabled: permissionsReady && can('MISSION_VIEW'),
    });
}

/** The mission list, 20 at a time, loading the next page as the list scrolls. */
export function useMissionList(status?: MissionStatus, search = '') {
    const {key, can, permissionsReady} = useCustomerKey();
    return useInfiniteQuery({
        queryKey: [...key, 'missions', 'infinite', {status, search}],
        queryFn: ({pageParam, signal}) => customerMissionService.missions(pageParam, status, search, signal),
        initialPageParam: 0,
        getNextPageParam: last => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
        enabled: permissionsReady && can('MISSION_VIEW'),
    });
}

export function useMissionDetail(id: number) {
    const {key, can, permissionsReady, user} = useCustomerKey();
    const valid = Number.isSafeInteger(id) && id > 0;
    const detail = useQuery({
        queryKey: [...key, 'mission', id],
        queryFn: ({signal}) => customerMissionService.mission(id, signal),
        enabled: valid && permissionsReady && can('MISSION_VIEW'),
    });
    const owned = detail.isSuccess && detail.data.customerId === user?.id;
    const timeline = useQuery({
        queryKey: [...key, 'mission', id, 'timeline'],
        queryFn: ({signal}) => customerMissionService.timeline(id, signal),
        enabled: owned && can('MISSION_TIMELINE_VIEW'),
    });
    const media = useQuery({
        queryKey: [...key, 'mission', id, 'media'],
        queryFn: ({signal}) => customerMissionService.media(id, signal),
        enabled: owned && can('MISSION_MEDIA_VIEW'),
    });
    return {detail, timeline, media};
}

export function useMissionActions() {
    const client = useQueryClient();
    const {key, user} = useCustomerKey();
    const opsKey = queryKeys.feature(user?.id, 'operations');
    const refresh = (id?: number) => Promise.all([
        client.invalidateQueries({queryKey: [...key, 'missions']}),
        id ? client.invalidateQueries({queryKey: [...key, 'mission', id]}) : undefined,
        client.invalidateQueries({queryKey: opsKey}),
    ]);
    return {
        create: useMutation({mutationFn: (data: MissionInput) => customerMissionService.create(data), onSuccess: data => refresh(data.id), retry: false}),
        update: useMutation({
            mutationFn: ({id, data, expectedVersion}: { id: number; data: MissionInput; expectedVersion: number }) =>
                customerMissionService.update(id, data, expectedVersion),
            onSettled: (_data, _error, {id}) => refresh(id),
            retry: false,
        }),
        submit: useMutation({mutationFn: (id: number) => customerMissionService.submit(id), onSettled: (_d, _e, id) => refresh(id), retry: false}),
        cancel: useMutation({mutationFn: (id: number) => customerMissionService.cancel(id), onSettled: (_d, _e, id) => refresh(id), retry: false}),
        upsertPermit: useMutation({
            mutationFn: ({id, data}: { id: number; data: MissionPermitUpsertInput }) =>
                customerMissionService.upsertPermit(id, data),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        availability: useMutation({
            mutationFn: ({startTime, endTime}: { startTime: string; endTime: string }) => customerMissionService.availability(startTime, endTime),
            retry: false,
        }),
    };
}
