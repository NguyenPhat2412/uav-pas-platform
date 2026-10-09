"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '../services/admin.service';
import { QueryState, EmptyState } from '@/components/data/WorkspaceState';
import { Pagination } from './Pagination';
export function AuditLogs(){const {user,can,permissionsReady}=useAuth();const [page,setPage]=useState(0);const q=useQuery({queryKey:['session',user?.id,'admin-audit',page],queryFn:({signal})=>adminService.audit(page,25,signal),enabled:permissionsReady&&can('AUDIT_READ')});return <div className="data-table"><QueryState query={q}>{q.data?.content.length?<><div className="table-scroll" tabIndex={0}><table className="console-table"><thead><tr><th>Thời gian</th><th>Actor</th><th>Action</th><th>Entity type</th><th>Entity ID</th><th>Details</th></tr></thead><tbody>{q.data.content.map(log=><tr key={log.id}><td>{log.createdAt.replace('T',' ')}</td><td>{log.actorUsername}<span className="table-secondary">#{log.actorUserId}</span></td><td>{log.action}</td><td>{log.entityType}</td><td>{log.entityId}</td><td className="max-w-md whitespace-pre-wrap">{log.details||'—'}</td></tr>)}</tbody></table></div><Pagination page={page} totalPages={q.data.totalPages} total={q.data.totalElements} onChange={setPage}/></>:<EmptyState title="Chưa có audit log"/>}</QueryState></div>}
