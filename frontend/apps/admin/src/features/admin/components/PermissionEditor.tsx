"use client";
import { displayLabel, permissionLabel } from '@uav/ui/presentation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Alert } from '@/components/ui';
import { QueryState } from '@/components/data/WorkspaceState';
import { useAdminReferenceData, useAdminInvalidation } from '../hooks';
import { adminService } from '../services/admin.service';
import { permissionState, saveChanges, type Override } from '../permission-model';
import type { Permission, RoleTemplate, User } from '../types';
import { Users } from './Users';

export function AccessControl(){
 const [selected,setSelected]=useState<User|null>(null);const {can}=useAuth();
 return <div className="space-y-6">{selected?<><Button variant="outline" onClick={()=>{if(window.confirm('Rời trình sửa quyền? Thay đổi chưa lưu sẽ bị bỏ.'))setSelected(null);}}>Chọn người dùng khác</Button><h2 className="text-lg font-semibold">{selected.username} · {displayLabel(selected.role)}</h2><PermissionEditor key={selected.id} target={selected}/></>:can('USER_READ')?<Users onSelect={setSelected}/>:<Alert variant="warning">Bạn cần quyền xem người dùng để tìm và chọn tài khoản.</Alert>}</div>;
}
export function PermissionEditor({target}:{target:User}){
 const {user,can}=useAuth();const {permissions,templates}=useAdminReferenceData();
 const overrides=useQuery({queryKey:['session',user?.id,'admin-user-permissions',target.id],queryFn:({signal})=>adminService.userPermissions(target.id,signal),enabled:can('PERMISSION_MANAGE')});
 const template=templates.data?.find(t=>t.role===target.role);
 return <QueryState query={permissions}><QueryState query={templates}><QueryState query={overrides}>{permissions.data&&overrides.data&&<Matrix permissions={permissions.data} template={template} target={target} values={Object.fromEntries(overrides.data.map(p=>[p.code,p.granted]))}/>}</QueryState></QueryState></QueryState>;
}
export function TemplateEditor(){
 const {permissions,templates}=useAdminReferenceData();const [role,setRole]=useState('');
 const template=templates.data?.find(t=>t.role===role)??templates.data?.[0];
 return <QueryState query={permissions}><QueryState query={templates}><div className="space-y-5"><label className="form-field max-w-md">Mẫu vai trò<select value={template?.role??''} onChange={e=>{if(window.confirm('Chuyển mẫu vai trò? Thay đổi chưa lưu sẽ bị bỏ.'))setRole(e.target.value);}}>{templates.data?.map(t=><option key={t.role} value={t.role}>{displayLabel(t.role)}</option>)}</select></label>{template&&permissions.data?<Matrix key={template.role} template={template} permissions={permissions.data} values={Object.fromEntries(template.permissions.map(code=>[code,true]))}/>:<Alert>Chưa có mẫu vai trò. Hiện chưa hỗ trợ tạo mẫu mới tại đây.</Alert>}</div></QueryState></QueryState>;
}
function Matrix({permissions,template,target,values}:{permissions:Permission[];template?:RoleTemplate;target?:User;values:Record<string,boolean>}){
 const [draft,setDraft]=useState<Record<string,Override>>({});const [filter,setFilter]=useState('');
 const invalidate=useAdminInvalidation();
 const changes=Object.entries(draft).filter(([code,value])=>value!==(values[code]??(target?null:false))).map(([code,value])=>({code,value}));
 const dirty=changes.length>0;
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const mutation=useMutation({mutationFn:async()=>{
   const result=await saveChanges(changes,({code,value})=>target?(value===null?adminService.clearUserPermission(target.id,code):adminService.setUserPermission(target.id,code,value)):adminService.setRolePermission(template!.role,code,value===true));
   return result;
 }});
 const reload=useMutation({mutationFn:()=>invalidate(target?.id,!target),onSuccess:()=>{setDraft({});mutation.reset();}});
 const save=async()=>{
   if(!window.confirm(`Lưu ${changes.length} thay đổi quyền${target?` cho ${target.username}`:` của ${template?.name}`}? Mỗi quyền được lưu riêng; thay đổi quyền quản trị có thể ảnh hưởng phiên hiện tại.`))return;
   await mutation.mutateAsync();setDraft({}); await invalidate(target?.id,!target);
   // The result stays visible while the server-backed queries refresh.
 };
 const result=mutation.data;
 const modules=[...new Set(permissions.map(p=>p.code.split('_')[0]))].sort();
 return <section className="space-y-4"><h2 className="text-lg font-semibold">{target?'Ma trận quyền hiệu lực':'Quyền theo vai trò'}</h2><p className="text-sm text-slate-600">Quyền cho phép hoặc từ chối riêng của tài khoản được ưu tiên hơn quyền theo vai trò. Chọn “Theo vai trò” để bỏ điều chỉnh riêng. Thay đổi mẫu vai trò vẫn giữ các điều chỉnh này.</p>
 {target?.status!=='ACTIVE'&&target&&<Alert variant="warning">Tài khoản {displayLabel(target.status).toLowerCase()} nên chưa thể sử dụng các quyền này.</Alert>}
 {result&&<Alert variant={result.failed.length?'warning':'success'}><p>Đã lưu: {result.succeeded.join(', ')||'không có'}.</p>{result.failed.length>0&&<ul>{result.failed.map(f=><li key={f.code}>Thất bại {f.code}: {f.message}</li>)}</ul>}<p>Không hoàn tác các quyền đã lưu. Tải lại quyền thực tế để tiếp tục chỉnh sửa.</p><Button size="sm" variant="outline" disabled={reload.isPending} isLoading={reload.isPending} onClick={()=>reload.mutate()}>Tải lại quyền thực tế</Button></Alert>}
 {reload.error&&<Alert variant="error">Không tải lại được quyền. Vui lòng thử lại.</Alert>}
 <div className="table-toolbar data-table permission-toolbar"><label className="table-search"><span className="sr-only">Lọc quyền</span><input placeholder="Tìm mã quyền" value={filter} onChange={e=>setFilter(e.target.value)}/></label><span role="status">{changes.length} thay đổi chưa lưu</span><Button disabled={!dirty||mutation.isPending||!!result} isLoading={mutation.isPending} onClick={()=>void save()}>Xem lại và lưu</Button><Button variant="outline" disabled={!dirty||mutation.isPending} onClick={()=>setDraft({})}>Hủy thay đổi</Button></div>
 {dirty&&<details className="rounded border bg-white p-3" open><summary>Xem lại thay đổi</summary><ul className="mt-2">{changes.map(c=><li key={c.code}>{c.code}: {c.value===null?'Theo vai trò':c.value?'Cho phép':'Từ chối'}</li>)}</ul></details>}
 {modules.map(module=>{const rows=permissions.filter(p=>p.code.startsWith(module+'_')&&(p.code + ' ' + permissionLabel(p.code, p.description)).toLowerCase().includes(filter.toLowerCase()));return rows.length>0&&<section key={module} className="data-table"><h3 className="console-panel-header font-semibold">{displayLabel(module)}</h3><div className="table-scroll" tabIndex={0} aria-label={`Quyền ${module}`}><table className="console-table"><thead><tr><th>Quyền</th><th>Theo vai trò</th><th>{dirty?'Hiệu lực dự kiến':'Hiệu lực'}</th><th>Nguồn</th><th>{target?'Quyền riêng':'Cấp quyền'}</th></tr></thead><tbody>{rows.map(p=>{
 const value=p.code in draft?draft[p.code]:(values[p.code]??(target?null:false));
 const effective=permissionState(p.code,template?.permissions,target?value:undefined,!target||target.status==='ACTIVE');
 const allowed=target?effective.allowed:value;
 return <tr key={p.code}><td><strong className="table-primary">{p.code}</strong><span className="table-secondary">{permissionLabel(p.code, p.description)}</span></td><td>{template?(template.permissions.includes(p.code)?'Cho phép':'Từ chối'):'Chưa xác định'}</td><td>{allowed===null?'Chưa xác định':allowed?'Cho phép':'Từ chối'}</td><td>{target ? ({'Override ALLOW':'Cho phép riêng','Override DENY':'Từ chối riêng','Template':'Theo vai trò','Chưa có dữ liệu template':'Chưa có dữ liệu vai trò'} as Record<string,string>)[effective.source] || effective.source : 'Theo vai trò'}</td><td><select aria-label={`${p.code} ${target?'override':'template'}`} className="permission-select" disabled={mutation.isPending||!!result} value={value===null?'inherit':String(value)} onChange={e=>setDraft(d=>({...d,[p.code]:e.target.value==='inherit'?null:e.target.value==='true'}))}>{target&&<option value="inherit">Theo vai trò</option>}<option value="true">Cho phép</option><option value="false">Từ chối</option></select></td></tr>;
 })}</tbody></table></div></section>;})}
 <Link className="text-primary underline" href="/audit-logs">Xem lịch sử trong nhật ký (cần AUDIT_READ)</Link></section>;
}
