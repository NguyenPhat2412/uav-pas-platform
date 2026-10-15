"use client";
import Link from 'next/link';
import { displayLabel } from '@uav/ui/presentation';
import { useState } from 'react';
import { useAdminUsers, useAdminUser, useAdminMutations } from '../hooks';
import { roles, type User, type UserRole } from '../types';
import { useAuth } from '@/contexts/AuthContext';
import { QueryState, EmptyState, ErrorNotice, PermissionGate } from '@/components/data/WorkspaceState';
import { Button, StatusBadge, Alert } from '@/components/ui';
import { Metadata } from '@/components/data/Drawer';
import { Pagination } from './Pagination';
import { PermissionEditor } from './PermissionEditor';

export function Users({onSelect}:{onSelect?:(user:User)=>void}){
 const [page,setPage]=useState(0);const [search,setSearch]=useState('');const [keyword,setKeyword]=useState('');const [role,setRole]=useState<UserRole|undefined>();
 const query=useAdminUsers(page,keyword,role);
 return <div className="data-table"><form className="table-toolbar" onSubmit={e=>{e.preventDefault();setKeyword(search.trim());setPage(0);}}><label className="table-search"><span className="sr-only">Tìm người dùng</span><input placeholder="Tên, email hoặc họ tên" value={search} onChange={e=>setSearch(e.target.value)}/></label><Button type="submit" size="sm" variant="outline">Tìm kiếm</Button><label className="table-filter"><span className="sr-only">Vai trò</span><select value={role??''} onChange={e=>{setRole((e.target.value||undefined) as UserRole|undefined);setPage(0);}}><option value="">Tất cả vai trò</option>{roles.map(r=><option key={r} value={r}>{displayLabel(r)}</option>)}</select></label></form>
 <QueryState query={query}>{query.data?.content.length?<div className="table-scroll" tabIndex={0} aria-label="Bảng người dùng"><table className="console-table"><thead><tr>{['Người dùng','Email','Vai trò','Trạng thái','Ngày tạo','Thao tác'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{query.data.content.map(u=><tr key={u.id}><td><strong className="table-primary">{u.username}</strong><span className="table-secondary">{u.fullName||'—'}</span></td><td>{u.email}</td><td>{displayLabel(u.role)}</td><td><StatusBadge status={u.status}/></td><td>{u.createdAt?.replace('T',' ')||'—'}</td><td>{onSelect?<Button size="sm" variant="outline" onClick={()=>onSelect(u)}>Chọn</Button>:<Link className="text-primary underline" href={`/users/${u.id}`}>Chi tiết</Link>}</td></tr>)}</tbody></table></div>:<EmptyState title="Không tìm thấy người dùng"/>}{query.data&&<Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/>}</QueryState></div>;
}
export function UserDetail({id}:{id:number}){
 const query=useAdminUser(id);const {can}=useAuth();
 if(!Number.isSafeInteger(id)||id<=0)return <Alert variant="error">Mã người dùng không hợp lệ.</Alert>;
 return <QueryState query={query}>{query.data&&<div className="space-y-6"><Link href="/users" className="text-primary underline">← Người dùng</Link><section className="console-panel p-5"><Metadata items={[["Tên đăng nhập",query.data.username],["Họ tên",query.data.fullName],["Email",query.data.email],["Điện thoại",query.data.phoneNumber],["Vai trò",displayLabel(query.data.role)],["Trạng thái",<StatusBadge key="status" status={query.data.status}/>],["Ngày tạo",query.data.createdAt?.replace('T',' ')]]}/></section>{can('USER_MANAGE')&&<AccountActions key={`${query.data.id}:${query.data.role}:${query.data.status}`} user={query.data}/>}<PermissionGate code="PERMISSION_MANAGE"><PermissionEditor target={query.data}/></PermissionGate></div>}</QueryState>;
}
function AccountActions({user}:{user:User}){
 const [role,setRole]=useState(user.role);const [message,setMessage]=useState('');const mutations=useAdminMutations();const pending=mutations.lock.isPending||mutations.unlock.isPending||mutations.role.isPending;
 const act=async(action:()=>Promise<unknown>,prompt:string)=>{if(!window.confirm(prompt))return;setMessage('');try{await action();setMessage('Đã lưu. Dữ liệu tài khoản được tải lại.');}catch{/* Mutation errors remain visible. */}};
 return <section className="console-panel p-5 space-y-4"><h2 className="font-semibold">Quản lý tài khoản</h2><div className="flex flex-wrap gap-3 items-end"><label className="form-field">Vai trò<select value={role} onChange={e=>setRole(e.target.value as UserRole)} disabled={pending}>{roles.map(r=><option key={r} value={r}>{displayLabel(r)}</option>)}</select></label><Button variant="outline" disabled={pending||role===user.role} onClick={()=>void act(()=>mutations.role.mutateAsync({id:user.id,nextRole:role}),`Đổi vai trò ${user.username} thành ${displayLabel(role)}? Quyền riêng vẫn giữ nguyên.`)}>Lưu vai trò</Button>{user.status==='SUSPENDED'?<Button disabled={pending} onClick={()=>void act(()=>mutations.unlock.mutateAsync(user.id),`Mở khóa ${user.username}?`)}>Mở khóa</Button>:<Button variant="danger" disabled={pending} onClick={()=>void act(()=>mutations.lock.mutateAsync(user.id),`Khóa tài khoản ${user.username}?`)}>Khóa tài khoản</Button>}</div><ErrorNotice error={mutations.lock.error||mutations.unlock.error||mutations.role.error}/>{message&&<Alert variant="success">{message}</Alert>}</section>;
}
