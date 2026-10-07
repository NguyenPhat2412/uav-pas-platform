'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/features/access/hooks/useAccessControl';
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Spinner } from '@/components/ui';
import { ErrorNotice, Pagination, ResourceState, selectClass } from '@/features/operations/components/ResourceState';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';

export default function AccessControlPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, can, permissionsReady, permissionError, refreshPermissions } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated, router]);
  if (isLoading || !isAuthenticated) return <main className="flex min-h-screen items-center justify-center"><Spinner label="Đang xác thực" /></main>;
  return <AppShell><div className="w-full">
    <PageHeader title="Quản lý người dùng và quyền" />
    {permissionError ? <><ErrorNotice error={permissionError} /><Button onClick={() => void refreshPermissions()}>Thử lại</Button></> : !permissionsReady ? <Spinner label="Đang kiểm tra quyền" /> : !can('PERMISSION_MANAGE') || !can('USER_READ') ? <Alert variant="warning">Bạn không có quyền quản lý truy cập. Cần quyền PERMISSION_MANAGE và USER_READ để chọn người dùng.</Alert> : <AccessEditor key={user?.id} />}
  </div></AppShell>;
}

function AccessEditor() {
  const [selectedId, setSelectedId] = useState<number>();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const access = useAccessControl(selectedId, true, page, keyword);
  const selected = access.users.data?.content.find(user => user.id === selectedId);
  const template = access.templates.data?.find(item => item.role === selected?.role);
  const overrides = useMemo(() => new Map((access.overrides.data || []).map(item => [item.code, item.granted])), [access.overrides.data]);
  const busy = access.setPermission.isPending || access.resetPermission.isPending;
  const resetFeedback = () => { access.setPermission.reset(); access.resetPermission.reset(); };
  const selectPage = (next: number) => { setPage(next); setSelectedId(undefined); resetFeedback(); };
  return <>
    <Card><CardHeader><CardTitle>Chọn người dùng</CardTitle></CardHeader><CardContent className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setKeyword(search.trim()); selectPage(0); }}>
        <Input label="Tìm người dùng" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tên hoặc email" disabled={busy} />
        <Button type="submit" variant="outline" disabled={busy}>Tìm kiếm</Button>
      </form>
      <ResourceState query={access.users}>
        {access.users.data?.content.length ? <><select aria-label="Chọn người dùng" className={`${selectClass} w-full`} disabled={busy} value={selectedId || ''} onChange={event => { setSelectedId(Number(event.target.value) || undefined); resetFeedback(); }}><option value="">Chọn người dùng</option>{access.users.data.content.map(user => <option value={user.id} key={user.id}>{user.username} · {user.role}</option>)}</select>{!busy && <Pagination page={page} pages={access.users.data.totalPages} onPage={selectPage} />}</> : <p className="text-sm text-secondary">Không tìm thấy người dùng.</p>}
      </ResourceState>
    </CardContent></Card>
    {selected && <Card><CardHeader><CardTitle>{selected.fullName || selected.username} · {selected.role}</CardTitle><p className="text-sm text-secondary">Bỏ chọn sẽ đặt DENY. Reset template xóa override và khôi phục quyền kế thừa. Quyền chỉ có hiệu lực khi tài khoản hoạt động.</p></CardHeader><CardContent className="space-y-4">
      <ErrorNotice error={access.setPermission.error || access.resetPermission.error} />
      {busy && <p role="status" className="text-sm text-secondary">Đang lưu quyền…</p>}
      {!busy && (access.setPermission.isSuccess || access.resetPermission.isSuccess) && <p role="status" className="text-sm text-green-700">Đã cập nhật quyền.</p>}
      <ResourceState query={access.permissions}><ResourceState query={access.templates}><ResourceState query={access.overrides}>
        {!template ? <Alert variant="warning">Không tìm thấy template cho vai trò này. Chưa thể xác định quyền kế thừa.</Alert> : <><p className="text-sm text-secondary">Template: {template.name}</p><div className="grid gap-3 md:grid-cols-2">{access.permissions.data?.map(permission => {
          const override = overrides.get(permission.code);
          const inherited = template.permissions.includes(permission.code);
          const effective = override ?? inherited;
          return <section aria-label={`Quyền ${permission.code}`} className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-4" key={permission.code}>
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" aria-label={permission.code} checked={effective} disabled={busy} onChange={event => access.setPermission.mutate({ userId: selected.id, code: permission.code, granted: event.target.checked })} /><span className="min-w-0"><b className="break-words text-sm">{permission.code}</b><small className="block text-secondary">{permission.description || 'Permission'}</small></span></label>
            <p className="text-xs text-secondary">Template: {inherited ? 'ALLOW' : 'DENY'} · Hiệu lực: {effective ? 'ALLOW' : 'DENY'}</p>
            <div className="flex flex-wrap items-center justify-between gap-2"><Badge variant={override === undefined ? 'secondary' : override ? 'success' : 'warning'}>{override === undefined ? 'Kế thừa template' : override ? 'Override: ALLOW' : 'Override: DENY'}</Badge>{override !== undefined && <Button size="sm" variant="outline" aria-label={`Reset template ${permission.code}`} disabled={busy} onClick={() => access.resetPermission.mutate({ userId: selected.id, code: permission.code })}>Reset template</Button>}</div>
          </section>;
        })}</div>{access.permissions.data?.length === 0 && <p className="text-sm text-secondary">Chưa có quyền trong danh mục.</p>}</>}
      </ResourceState></ResourceState></ResourceState>
    </CardContent></Card>}
  </>;
}
