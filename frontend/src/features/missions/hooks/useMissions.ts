'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {missionService} from "@/features/missions/services/mission.service";
import {MissionStatus} from "@/features/missions/types/mission.types";

export function useMissions(filters?: { status?: MissionStatus; search?: string }) {
    const query = useQuery({
        queryKey: ['missions', 'list', filters ?? {}],
        queryFn: () => missionService.list(filters),
    });
    return {
        missions: query.data?.content ?? [],
        isLoading: query.isLoading,
        error: query.error instanceof Error ? query.error.message : null,
        reload: query.refetch
    };
}

export function useMissionMutations() {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({queryKey: ['missions']});
    const submit = useMutation({mutationFn: (id: number) => missionService.submit(id), onSuccess: invalidate});
    const cancel = useMutation({mutationFn: (id: number) => missionService.cancel(id), onSuccess: invalidate});
    const confirm = useMutation({mutationFn: (id: number) => missionService.confirm(id), onSuccess: invalidate});
    const reject = useMutation({
        mutationFn: ({id, reason}: {
            id: number;
            reason: string
        }) => missionService.reject(id, reason), onSuccess: invalidate
    });
    const ready = useMutation({mutationFn: (id: number) => missionService.ready(id), onSuccess: invalidate});
    const start = useMutation({mutationFn: (id: number) => missionService.start(id), onSuccess: invalidate});
    const complete = useMutation({
        mutationFn: ({id, note, condition}: {
            id: number;
            note: string;
            condition?: string
        }) => missionService.complete(id, note, condition), onSuccess: invalidate
    });
    const fail = useMutation({
        mutationFn: ({id, reason, notes}: {
            id: number;
            reason: string;
            notes?: string
        }) => missionService.fail(id, reason, notes), onSuccess: invalidate
    });
    return {submit, cancel, confirm, reject, ready, start, complete, fail};
}
