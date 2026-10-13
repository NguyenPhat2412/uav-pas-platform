"use client";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from './services/admin.service';
import type { UserRole } from './types';
export function useAdminUsers(page: number, keyword: string, role?: UserRole) {
 const { user, can, permissionsReady }=useAuth();
 const isDemo = typeof window !== 'undefined' && (window.location.search.includes('demo=true') || window.localStorage.getItem('isDemo') === 'true');
 return useQuery({queryKey:['session',user?.id,'admin-users',page,keyword,role],queryFn:({signal})=>adminService.users(page,keyword,role,signal),enabled:isDemo || (permissionsReady && can('USER_READ'))});
}

export function useAdminUser(id:number){const {user,can,permissionsReady}=useAuth();return useQuery({queryKey:['session',user?.id,'admin-user',id],queryFn:({signal})=>adminService.user(id,signal),enabled:permissionsReady && can('USER_READ') && Number.isSafeInteger(id) && id>0});}
export function useAdminReferenceData(){
 const {user,can,permissionsReady}=useAuth();const enabled=permissionsReady && can('PERMISSION_MANAGE');
 const permissions=useQuery({queryKey:['session',user?.id,'admin-permissions'],queryFn:({signal})=>adminService.permissions(signal),enabled});
 const templates=useQuery({queryKey:['session',user?.id,'admin-role-templates'],queryFn:({signal})=>adminService.roleTemplates(signal),enabled});
 return {permissions,templates};
}
export function useAdminInvalidation(){
 const client=useQueryClient();const {user}=useAuth();
 return async (targetId?:number,template=false)=>{
  const features=['admin-users','admin-audit','admin-dashboard'];
  if(template)features.push('admin-role-templates');
  await client.invalidateQueries({predicate:q=>q.queryKey[0]==='session' && q.queryKey[1]===user?.id && (features.includes(String(q.queryKey[2])) || ((q.queryKey[2]==='admin-user'||q.queryKey[2]==='admin-user-permissions') && (template || q.queryKey[3]===targetId)) || (q.queryKey[2]==='permissions' && (template || targetId===user?.id)))});
 };
}
export function useAdminMutations(){
 const invalidate=useAdminInvalidation();
 const lock=useMutation({mutationFn:adminService.lock,onSettled:(_d,_e,id)=>invalidate(id)});
 const unlock=useMutation({mutationFn:adminService.unlock,onSettled:(_d,_e,id)=>invalidate(id)});
 const role=useMutation({mutationFn:({id,nextRole}:{id:number;nextRole:UserRole})=>adminService.updateRole(id,nextRole),onSettled:(_d,_e,{id})=>invalidate(id)});
 return {lock,unlock,role};
}
