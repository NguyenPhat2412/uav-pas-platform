'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';
import {customerMissionService} from '@/features/missions/api/customer-missions.api';
import type {MissionInput, MissionStatus, MissionType} from '@/types/customer';

export function useCustomerScope() {
    const auth = useAuth();
    return {...auth, key: queryKeys.feature(auth.user?.id, 'customer')};
}

export function useServices() {
    const {key, can, permissionsReady} = useCustomerScope();
    return useQuery({
        queryKey: [...key, 'services'],
        queryFn: ({signal}) => customerMissionService.services(signal),
        enabled: (permissionsReady && can('MISSION_VIEW'))
    });
}

export function useMissions(search = '', page = 0, status?: MissionStatus, missionType?: MissionType) {
    const {key, user, can, permissionsReady} = useCustomerScope();
    return useQuery({
        queryKey: [...key, 'missions', {search, page, status, missionType}],
        queryFn: ({signal}) => customerMissionService.missions(search, page, status, missionType, signal),
        enabled: (!!user && permissionsReady && can('MISSION_VIEW'))
    });
}

export function useMission(id: number) {
    const {key, can, permissionsReady} = useCustomerScope();
    return useQuery({
        queryKey: [...key, 'mission', id],
        queryFn: ({signal}) => customerMissionService.mission(id, signal),
        enabled: Number.isSafeInteger(id) && id > 0 && ((permissionsReady && can('MISSION_VIEW')))
    });
}

export function useMissionDetail(id: number) {
    const {key, can, permissionsReady, user} = useCustomerScope();
    const detail = useMission(id);
    const owned = (detail.isSuccess && detail.data.customerId === user?.id);
    const timeline = useQuery({
        queryKey: [...key, 'mission', id, 'timeline'],
        queryFn: ({signal}) => customerMissionService.timeline(id, signal),
        enabled: owned && ((permissionsReady && can('MISSION_TIMELINE_VIEW')))
    });
    const media = useQuery({
        queryKey: [...key, 'mission', id, 'media'],
        queryFn: ({signal}) => customerMissionService.media(id, signal),
        enabled: owned && ((permissionsReady && can('MISSION_MEDIA_VIEW')))
    });
    return {detail, timeline, media};
}

export function useMissionActions() {
    const client = useQueryClient();
    const {key} = useCustomerScope();
    const refresh = async (id: number) => {
        await Promise.all([client.invalidateQueries({queryKey: [...key, 'missions']}), client.invalidateQueries({queryKey: [...key, 'mission', id]})]);
    };
    const submit = useMutation({
        mutationFn: (id: number) => customerMissionService.submit(id),
        onSettled: (_data, _error, id) => refresh(id),
        retry: false
    });
    const cancel = useMutation({
        mutationFn: (id: number) => customerMissionService.cancel(id),
        onSettled: (_data, _error, id) => refresh(id),
        retry: false
    });
    const create = useMutation({
        mutationFn: (data: MissionInput) => customerMissionService.create(data),
        onSuccess: data => refresh(data.id),
        retry: false
    });
    const update = useMutation({
        mutationFn: ({id, data, expectedVersion}: {
            id: number;
            data: MissionInput;
            expectedVersion: number
        }) => customerMissionService.update(id, data, expectedVersion),
        onSettled: (_data, _error, {id}) => refresh(id),
        retry: false
    });
    return {submit, cancel, create, update};
}
