"use client";
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
 return <div className="space-y-6">{selected?<><Button variant="outline" onClick={()=>{if(window.confirm('Rời trình sửa quyền? Thay đổi chưa lưu sẽ bị bỏ.'))setSelected(null);}}>Chọn người dùng khác</Button><h2 className="text-lg font-semibold">{selected.username} · {selected.role}</h2><PermissionEditor key={selected.id} target={selected}/></>:can('USER_READ')?<Users onSelect={setSelected}/>:<Alert variant="warning">Cần USER_READ để tìm và chọn tài khoản.</Alert>}</div>;
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
 return <QueryState query={permissions}><QueryState query={templates}><div className="space-y-5"><label className="form-field max-w-md">Mẫu vai trò<select value={template?.role??''} onChange={e=>{if(window.confirm('Chuyển template? Thay đổi chưa lưu sẽ bị bỏ.'))setRole(e.target.value);}}>{templates.data?.map(t=><option key={t.role} value={t.role}>{t.name} · {t.role}</option>)}</select></label>{template&&permissions.data?<Matrix key={template.role} template={template} permissions={permissions.data} values={Object.fromEntries(template.permissions.map(code=>[code,true]))}/>:<Alert>Chưa có template. Backend chưa hỗ trợ tạo template tùy ý từ giao diện.</Alert>}</div></QueryState></QueryState>;
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
 const save=async()=>{
   if(!window.confirm(`Lưu ${changes.length} thay đổi quyền${target?` cho ${target.username}`:` của ${template?.name}`}? Mỗi quyền được lưu riêng; thay đổi quyền quản trị có thể ảnh hưởng phiên hiện tại.`))return;
   await mutation.mutateAsync();setDraft({}); await invalidate(target?.id,!target);
   // The result stays visible while the server-backed queries refresh.
 };
 const result=mutation.data;
 const modules=[...new Set(permissions.map(p=>p.code.split('_')[0]))].sort();
 return <section className="space-y-4"><h2 className="text-lg font-semibold">{target?'Ma trận quyền hiệu lực':'Quyền của template'}</h2><p className="text-sm text-slate-600">Override ALLOW/DENY có ưu tiên cao hơn template. Khôi phục template xóa override; DENY là từ chối rõ ràng. Thay đổi template không xóa override riêng.</p>
 {target?.status!=='ACTIVE'&&target&&<Alert variant="warning">Tài khoản {target.status}: backend không cho phép sử dụng quyền.</Alert>}
 {result&&<Alert variant={result.failed.length?'warning':'success'}><p>Đã lưu: {result.succeeded.join(', ')||'không có'}.</p>{result.failed.length>0&&<ul>{result.failed.map(f=><li key={f.code}>Thất bại {f.code}: {f.message}</li>)}</ul>}<p>Không hoàn tác các quyền đã lưu.</p><Button size="sm" variant="outline" onClick={()=>void invalidate(target?.id,!target)}>Tải lại quyền thực tế</Button></Alert>}
 <div className="table-toolbar rounded border bg-white"><label className="table-search"><span className="sr-only">Lọc quyền</span><input placeholder="Tìm mã quyền" value={filter} onChange={e=>setFilter(e.target.value)}/></label><span role="status">{changes.length} thay đổi chưa lưu</span><Button disabled={!dirty||mutation.isPending||!!result} isLoading={mutation.isPending} onClick={()=>void save()}>Xem lại và lưu</Button><Button variant="outline" disabled={!dirty||mutation.isPending} onClick={()=>setDraft({})}>Hủy thay đổi</Button></div>
 {dirty&&<details className="rounded border bg-white p-3" open><summary>Xem lại thay đổi</summary><ul className="mt-2">{changes.map(c=><li key={c.code}>{c.code}: {c.value===null?'Khôi phục template':c.value?'ALLOW':'DENY'}</li>)}</ul></details>}
 {modules.map(module=>{const rows=permissions.filter(p=>p.code.startsWith(module+'_')&&p.code.toLowerCase().includes(filter.toLowerCase()));return rows.length>0&&<section key={module} className="data-table"><h3 className="console-panel-header font-semibold">{module}</h3><div className="table-scroll" tabIndex={0} aria-label={`Quyền ${module}`}><table className="console-table"><thead><tr><th>Quyền</th><th>Template</th><th>{dirty?'Hiệu lực dự kiến':'Hiệu lực'}</th><th>Nguồn</th><th>{target?'Override':'Cấp quyền'}</th></tr></thead><tbody>{rows.map(p=>{
 const value=p.code in draft?draft[p.code]:(values[p.code]??(target?null:false));
 const effective=permissionState(p.code,template?.permissions,target?value:undefined,!target||target.status==='ACTIVE');
 const allowed=target?effective.allowed:value;
 return <tr key={p.code}><td><strong className="table-primary">{p.code}</strong><span className="table-secondary">{p.description}</span></td><td>{template?(template.permissions.includes(p.code)?'ALLOW':'DENY'):'Chưa xác định'}</td><td>{allowed===null?'Chưa xác định':allowed?'Allowed':'Denied'}</td><td>{target?effective.source:'Template'}</td><td><select aria-label={`${p.code} ${target?'override':'template'}`} className="rounded border p-2" disabled={mutation.isPending||!!result} value={value===null?'inherit':String(value)} onChange={e=>setDraft(d=>({...d,[p.code]:e.target.value==='inherit'?null:e.target.value==='true'}))}>{target&&<option value="inherit">Khôi phục template</option>}<option value="true">ALLOW</option><option value="false">DENY</option></select></td></tr>;
 })}</tbody></table></div></section>;})}
 <Link className="text-primary underline" href="/audit-logs">Xem lịch sử trong nhật ký (cần AUDIT_READ)</Link></section>;
}
