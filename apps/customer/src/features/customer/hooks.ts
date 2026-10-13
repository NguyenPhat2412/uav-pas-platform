'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { sessionKey } from '@uav/query';
import { customerService } from './service';
import type { MissionInput, MissionStatus } from './types';

function isDemoSession() {
  return typeof window !== 'undefined' && (window.location.search.includes('demo=true') || window.localStorage.getItem('isDemo') === 'true');
}

export function useCustomerScope() {
  const auth = useAuth();
  return { ...auth, key: sessionKey(String(auth.user?.id ?? 'anonymous'), 'customer') };
}
export function useServices() {
  const { key, can, permissionsReady } = useCustomerScope();
  const isDemo = isDemoSession();
  return useQuery({ queryKey: [...key, 'services'], queryFn: ({ signal }) => customerService.services(signal), enabled: isDemo || (permissionsReady && can('MISSION_VIEW')) });
}
export function useMissions(search = '', page = 0, status?: MissionStatus) {
  const { key, user, can, permissionsReady } = useCustomerScope();
  const isDemo = isDemoSession();
  return useQuery({ queryKey: [...key, 'missions', { search, page, status }], queryFn: ({ signal }) => customerService.missions(search, page, status, signal), enabled: isDemo || (!!user && permissionsReady && can('MISSION_VIEW')) });
}
export function useMission(id: number) {
  const { key, can, permissionsReady } = useCustomerScope();
  const isDemo = isDemoSession();
  return useQuery({ queryKey: [...key, 'mission', id], queryFn: ({ signal }) => customerService.mission(id, signal), enabled: Number.isSafeInteger(id) && id > 0 && (isDemo || (permissionsReady && can('MISSION_VIEW'))) });
}
export function useMissionDetail(id: number) {
  const { key, can, permissionsReady, user } = useCustomerScope();
  const isDemo = isDemoSession();
  const detail = useMission(id);
  const owned = isDemo || (detail.isSuccess && detail.data.customerId === user?.id);
  const timeline = useQuery({ queryKey: [...key, 'mission', id, 'timeline'], queryFn: ({ signal }) => customerService.timeline(id, signal), enabled: owned && (isDemo || (permissionsReady && can('MISSION_TIMELINE_VIEW'))) });
  const media = useQuery({ queryKey: [...key, 'mission', id, 'media'], queryFn: ({ signal }) => customerService.media(id, signal), enabled: owned && (isDemo || (permissionsReady && can('MISSION_MEDIA_VIEW'))) });
  return { detail, timeline, media };
}
export function useMissionActions() {
  const client = useQueryClient(); const { key } = useCustomerScope();
  const refresh = async (id: number) => { await Promise.all([client.invalidateQueries({ queryKey: [...key, 'missions'] }), client.invalidateQueries({ queryKey: [...key, 'mission', id] })]); };
  const submit = useMutation({ mutationFn: (id: number) => customerService.submit(id), onSuccess: (_, id) => refresh(id), retry: false });
  const cancel = useMutation({ mutationFn: (id: number) => customerService.cancel(id), onSuccess: (_, id) => refresh(id), retry: false });
  const create = useMutation({ mutationFn: (data: MissionInput) => customerService.create(data), onSuccess: data => refresh(data.id), retry: false });
  const update = useMutation({ mutationFn: ({ id, data }: { id: number; data: MissionInput }) => customerService.update(id, data), onSuccess: data => refresh(data.id), retry: false });
  return { submit, cancel, create, update };
}
export function useBilling() {
  const { key, user } = useCustomerScope();
  const isDemo = isDemoSession();
  const quota = useQuery({ queryKey: [...key, 'billing', 'quota'], queryFn: ({ signal }) => customerService.quota(signal), enabled: isDemo || !!user });
  const invoices = useQuery({ queryKey: [...key, 'billing', 'invoices'], queryFn: ({ signal }) => customerService.invoices(0, signal), enabled: isDemo || !!user });
  const plans = useQuery({ queryKey: [...key, 'billing', 'plans'], queryFn: ({ signal }) => customerService.plans(signal), enabled: isDemo || !!user });
  const pay = useMutation({ mutationFn: (id: number) => customerService.payInvoice(id), retry: false });
  return { quota, invoices, plans, pay };
}
