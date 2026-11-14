'use client';
import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';
import {customerMissionService} from '@/api/mission/customer-missions.api';
import type {
    MissionInput,
    MissionPermitUpsertInput,
    MissionPermitVerifyInput,
    MissionReviewUpsertInput,
    MissionStatus,
    MissionType,
    SavedFlightSiteUpsertInput,
} from '@/types/customer';

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

export function useSavedFlightSites() {
    const {key, user, can, permissionsReady} = useCustomerScope();
    return useQuery({
        queryKey: [...key, 'flight-sites'],
        queryFn: ({signal}) => customerMissionService.flightSites(signal),
        enabled: !!user && permissionsReady && can('MISSION_VIEW'),
    });
}

export function useMissionReview(id: number, enabled = true) {
    const {key, can, permissionsReady} = useCustomerScope();
    return useQuery({
        queryKey: [...key, 'mission', id, 'review'],
        queryFn: ({signal}) => customerMissionService.getReview(id, signal),
        enabled: enabled && Number.isSafeInteger(id) && id > 0 && permissionsReady && can('MISSION_VIEW'),
    });
}

export function useMissionInspectionReport(id: number, enabled = true) {
    const {key, can, permissionsReady} = useCustomerScope();
    return useQuery({
        queryKey: [...key, 'mission', id, 'inspection-report'],
        queryFn: ({signal}) => customerMissionService.inspectionReport(id, signal),
        enabled: enabled && Number.isSafeInteger(id) && id > 0 && permissionsReady && can('MISSION_VIEW'),
    });
}

export function useMissions(search = '', page = 0, status?: MissionStatus, missionType?: MissionType) {
    const {key, user, can, permissionsReady} = useCustomerScope();
    return useQuery({
        queryKey: [...key, 'missions', {search, page, status, missionType}],
        placeholderData: keepPreviousData,
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
    const owned = detail.isSuccess && (detail.data.customerId === user?.id || can('MISSION_VIEW_ALL'));
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
    const upsertPermit = useMutation({
        mutationFn: ({id, payload}: { id: number; payload: MissionPermitUpsertInput }) =>
            customerMissionService.upsertPermit(id, payload),
        onSettled: (_data, _error, {id}) => refresh(id),
        retry: false,
    });
    const verifyPermit = useMutation({
        mutationFn: ({id, payload}: { id: number; payload: MissionPermitVerifyInput }) =>
            customerMissionService.verifyPermit(id, payload),
        onSettled: (_data, _error, {id}) => refresh(id),
        retry: false,
    });
    const uploadPermitDocument = useMutation({
        mutationFn: async ({id, file}: { id: number; file: File }) => {
            const signed = await customerMissionService.requestMediaUpload(id, file);
            await customerMissionService.uploadFile(signed.url, file);
            await customerMissionService.confirmMedia(id, signed.mediaId);
            return customerMissionService.attachMedia(id, signed.mediaId, 'DOCUMENT');
        },
        onSettled: (_data, _error, {id}) => refresh(id),
        retry: false,
    });
    const clone = useMutation({
        mutationFn: (id: number) => customerMissionService.clone(id),
        onSuccess: data => refresh(data.id),
        retry: false,
    });
    const upsertReview = useMutation({
        mutationFn: ({id, payload}: { id: number; payload: MissionReviewUpsertInput }) =>
            customerMissionService.upsertReview(id, payload),
        onSettled: async (_data, _error, {id}) => {
            await Promise.all([
                refresh(id),
                client.invalidateQueries({queryKey: [...key, 'mission', id, 'review']}),
                client.invalidateQueries({queryKey: [...key, 'mission', id, 'timeline']}),
            ]);
        },
        retry: false,
    });
    const createSite = useMutation({
        mutationFn: (payload: SavedFlightSiteUpsertInput) =>
            customerMissionService.createFlightSite(payload),
        onSuccess: () => client.invalidateQueries({queryKey: [...key, 'flight-sites']}),
        retry: false,
    });
    const deleteSite = useMutation({
        mutationFn: (id: number) => customerMissionService.deleteFlightSite(id),
        onSuccess: () => client.invalidateQueries({queryKey: [...key, 'flight-sites']}),
        retry: false,
    });
    return {
        submit,
        cancel,
        create,
        clone,
        update,
        upsertPermit,
        verifyPermit,
        uploadPermitDocument,
        upsertReview,
        createSite,
        deleteSite,
    };
}
