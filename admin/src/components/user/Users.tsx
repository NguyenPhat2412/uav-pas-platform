/* eslint-disable @next/next/no-img-element -- avatars use signed storage URLs, which next/image cannot optimise without remote patterns. */
"use client";

import Link from 'next/link';
import {useState, type FormEvent} from 'react';
import {Lock} from 'lucide-react';
import {displayLabel, formatDate} from '@/lib/presentation';
import {useAdminMutations, useAdminUser, useAdminUserCounts, useAdminUsers} from '@/hooks/user/useAdminUsers';
import {canSubmitAdminPasswordReset, toAdminPasswordResetPayload} from '@/forms/user/user-form';
import {type User, type UserRole, type UserStatus} from '@/types/admin';
import {useAuth} from '@/providers/AuthContext';
import {confirmDialog} from '@/providers/ConfirmContext';
import {EmptyState, ErrorNotice, PermissionGate, QueryState} from '@/components/data/WorkspaceState';
import {Alert, Badge, Button, Card, CardContent, FormField, PasswordInput, StatusBadge} from '@/components/ui';
import {Metadata} from '@/components/data/Drawer';
import {Pagination} from '@/components/data/Pagination';
import {PermissionEditor} from '@/components/access/PermissionEditor';
import {cn} from '@/lib/utils';
import {toUserSlug} from '@/lib/url-slugs';
import {useI18n} from '@/providers/I18nContext';
import {avatarSrc} from '@/components/shared/Avatar';
import {CustomerBillingProfileCard} from '@/components/billing/CustomerBillingProfileCard';
import {UserAccountActions, UserActivitySection} from '@/components/user/UserDetailSections';
import {UserFormDrawer} from '@/components/user/UserFormDrawer';
import {UsersToolbar} from '@/components/user/UsersToolbar';

const roleBadgeVariants: Record<string, 'primary' | 'warning' | 'secondary' | 'outline'> = {
    ROLE_ADMIN: 'primary',
    ROLE_COMMANDER: 'warning',
    ROLE_OPERATOR: 'secondary',
    ROLE_PILOT: 'outline',
};

/** Stable warm red–amber avatar tint per account (330°–40°) so no avatar renders blue or green. */
function avatarHue(seed: string) {
    let hash = 0;
    for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 70;
    return (330 + hash) % 360;
}

export function UserAvatar({user, size = 36}: { user: Pick<User, 'username' | 'fullName' | 'avatarUrl'>; size?: number }) {
    const name = user.fullName || user.username;
    const initials = name.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase();
    const hue = avatarHue(user.username);
    return (
        <span
            className="inline-flex flex-none items-center justify-center overflow-hidden rounded-full text-[13px] font-bold"
            aria-hidden="true"
            style={{width: size, height: size, background: `hsl(${hue} 70% 94%)`, color: `hsl(${hue} 55% 32%)`}}
        >
            {user.avatarUrl ? <img src={avatarSrc(user.avatarUrl)} alt="" className="h-full w-full object-cover"/> : initials}
        </span>
    );
}

export function Users({onSelect}: { onSelect?: (user: User) => void }) {
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [keyword, setKeyword] = useState('');
    const [role, setRole] = useState<UserRole | undefined>();
    const [status, setStatus] = useState<UserStatus | undefined>();
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState('');
    const {t} = useI18n();
    const {can, user: me} = useAuth();
    const mutations = useAdminMutations();
    const canCreate = !onSelect && can('USER_CREATE');
    const manage = !onSelect && can('USER_LOCK');
    const query = useAdminUsers(page, keyword, role, status);
    const counts = useAdminUserCounts(keyword, role);
    const pageIds = (query.data?.content ?? []).filter(u => u.id !== me?.id).map(u => u.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));

    const toggle = (id: number) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const bulk = async (locked: boolean) => {
        const ids = [...selected];
        if (!(await confirmDialog(t(locked ? 'admin.users.bulk.lockConfirm' : 'admin.users.bulk.unlockConfirm', {count: ids.length})))) return;
        setNotice('');
        try {
            const result = await mutations.bulkLock.mutateAsync({ids, locked});
            const self = result.skipped.filter(s => s.reason === 'SELF').length;
            setNotice([t('admin.users.bulk.done', {count: result.processed.length}), self ? t('admin.users.bulk.skippedSelf') : ''].filter(Boolean).join(' '));
            setSelected(new Set());
        } catch { /* Shown below. */ }
    };

    const exportCsv = async () => {
        try {
            const csv = await mutations.exportCsv.mutateAsync({keyword, role, status});
            const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
            Object.assign(document.createElement('a'), {href: url, download: `users-${new Date().toISOString().slice(0, 10)}.csv`}).click();
            URL.revokeObjectURL(url);
        } catch { /* Global mutation toast reports failure. */ }
    };

    return (
        <div className="space-y-5">
            <Card className="min-w-0 border-border">
                <UsersToolbar
                    status={status}
                    counts={counts}
                    search={search}
                    role={role}
                    selectedCount={selected.size}
                    manage={manage}
                    canCreate={canCreate}
                    pickerMode={Boolean(onSelect)}
                    bulkPending={mutations.bulkLock.isPending}
                    exportPending={mutations.exportCsv.isPending}
                    onChooseStatus={next => { setStatus(next); setPage(0); setSelected(new Set()); }}
                    onSearchChange={next => { setSearch(next); if (next === '') { setKeyword(''); setPage(0); } }}
                    onSearchSubmit={() => { setKeyword(search.trim()); setPage(0); }}
                    onRoleChange={next => { setRole(next); setPage(0); }}
                    onExportCsv={() => void exportCsv()}
                    onOpenCreate={() => setCreating(true)}
                    onBulkLock={locked => void bulk(locked)}
                    onClearSelection={() => setSelected(new Set())}
                />
                {(notice || mutations.bulkLock.error) && (
                    <div className="px-4 pt-3">
                        {notice && <Alert variant="success">{notice}</Alert>}
                        <ErrorNotice error={mutations.bulkLock.error}/>
                    </div>
                )}
                <QueryState query={query}>
                    {query.data?.content.length ? (
                        <div className="max-h-[640px] overflow-auto" tabIndex={0} aria-label={t('admin.users.table')}>
                            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                                <thead>
                                <tr>
                                    {manage && (
                                        <th className="sticky top-0 z-10 w-10 border-b border-border bg-slate-50 px-4 py-3 text-center">
                                            <input type="checkbox" checked={allSelected} aria-label={t('admin.users.bulk.selectPage')} onChange={() => setSelected(allSelected ? new Set() : new Set(pageIds))}/>
                                        </th>
                                    )}
                                    {['user', 'email', 'role', 'status', 'created', 'actions'].map(col => (
                                        <th key={col} className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                                            {t(`admin.users.col.${col}`)}
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                {query.data.content.map(u => (
                                    <tr key={u.id} className={cn('transition-colors hover:bg-background', selected.has(u.id) && 'bg-red-50/50')}>
                                        {manage && (
                                            <td className="w-10 px-4 py-3.5 text-center align-middle">
                                                {u.id !== me?.id && <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} aria-label={t('admin.users.bulk.selectRow', {name: u.username})}/>}
                                            </td>
                                        )}
                                        <td data-label={t('admin.users.col.user')} className="px-4 py-3.5 align-middle text-foreground">
                                            <div className="flex items-center gap-2.5">
                                                <UserAvatar user={u}/>
                                                <div className="flex min-w-0 flex-col">
                                                    <strong className="font-semibold text-foreground">{u.fullName || u.username}</strong>
                                                    <span className="mt-0.5 block text-xs text-muted">@{u.username}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label={t('admin.users.col.email')} className="px-4 py-3.5 align-middle text-foreground">{u.email}</td>
                                        <td data-label={t('admin.users.col.role')} className="px-4 py-3.5 align-middle text-foreground">
                                            <Badge variant={roleBadgeVariants[u.role] ?? 'default'}>{displayLabel(u.role)}</Badge>
                                        </td>
                                        <td data-label={t('admin.users.col.status')} className="px-4 py-3.5 align-middle text-foreground">
                                            <div className="flex flex-wrap gap-1.5">
                                                {!u.locked && <StatusBadge status={u.status}/>}
                                                {u.locked && <Badge variant="error" icon={<Lock size={11} aria-hidden="true"/>}>{t('admin.users.lockedBadge')}</Badge>}
                                            </div>
                                        </td>
                                        <td data-label={t('admin.users.col.created')} className="px-4 py-3.5 align-middle text-foreground">{formatDate(u.createdAt)}</td>
                                        <td data-label={t('admin.users.col.actions')} className="px-4 py-3.5 align-middle text-foreground">
                                            {onSelect
                                                ? <Button size="sm" variant="outline" onClick={() => onSelect(u)}>{t('admin.users.select')}</Button>
                                                : <Link className="text-xs font-semibold text-primary hover:underline" href={`/admin/users/${toUserSlug(u)}`}>{t('admin.users.details')}</Link>}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState title={t('admin.users.emptyTitle')} detail={status || keyword || role ? t('admin.users.emptyDetail') : undefined}/>
                    )}
                    {query.data && <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/>}
                </QueryState>
            </Card>
            {creating && <UserFormDrawer onClose={() => setCreating(false)} onCreated={name => { setCreating(false); setNotice(t('admin.users.create.done', {name})); }}/>}
        </div>
    );
}

export function UserDetail({id}: { id: number }) {
    const query = useAdminUser(id);
    const {can} = useAuth();
    const {t} = useI18n();
    if (!Number.isSafeInteger(id) || id <= 0) return <Alert variant="error">{t('admin.users.invalidId')}</Alert>;
    return (
        <QueryState query={query}>
            {query.data && (
                <div className="space-y-6">
                    <Link href="/admin/users" className="text-primary underline">{t('admin.users.back')}</Link>
                    <Card className="border-border">
                        <CardContent>
                            <Metadata
                                items={[
                                    [t('admin.users.field.username'), query.data.username],
                                    [t('admin.users.field.fullName'), query.data.fullName],
                                    [t('admin.users.field.email'), query.data.email],
                                    [t('admin.users.field.phone'), query.data.phoneNumber],
                                    [t('admin.users.field.role'), displayLabel(query.data.role)],
                                    [t('admin.users.field.status'), <StatusBadge key="status" status={query.data.locked ? 'LOCKED' : query.data.status}/>],
                                    [t('admin.users.field.created'), formatDate(query.data.createdAt)],
                                ]}
                            />
                        </CardContent>
                    </Card>
                    {can('USER_VIEW') && <CustomerBillingProfileCard userId={query.data.id}/>}
                    {(can('USER_LOCK') || can('USER_UNLOCK') || can('USER_PERMISSION_MANAGE')) && (
                        <UserAccountActions key={`${query.data.id}:${query.data.role}:${query.data.status}:${Boolean(query.data.locked)}`} user={query.data}/>
                    )}
                    {can('USER_UPDATE') && <PasswordReset user={query.data}/>}
                    {can('AUDIT_VIEW') && <UserActivitySection user={query.data}/>}
                    <PermissionGate code="USER_PERMISSION_MANAGE"><PermissionEditor target={query.data}/></PermissionGate>
                </div>
            )}
        </QueryState>
    );
}

function PasswordReset({user}: { user: User }) {
    const {t} = useI18n();
    const {resetPassword} = useAdminMutations();
    const [password, setPassword] = useState('');
    const [done, setDone] = useState(false);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmitAdminPasswordReset(password)) return;
        if (!(await confirmDialog(t('admin.users.reset.confirm', {name: user.username})))) return;
        setDone(false);
        try {
            await resetPassword.mutateAsync(toAdminPasswordResetPayload(user.id, password));
            setPassword('');
            setDone(true);
        } catch { /* Shown below. */ }
    };
    return (
        <Card className="border-border">
            <CardContent className="space-y-3">
                <h2 className="font-semibold text-foreground">{t('admin.users.reset.title')}</h2>
                <form noValidate className="flex flex-wrap items-end gap-3" onSubmit={e => void submit(e)}>
                    <FormField id="admin-reset-password" label={t('admin.users.reset.newPassword')} required className="w-auto min-w-[240px] max-w-sm flex-1">
                        <PasswordInput id="admin-reset-password" required aria-required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="text-sm"/>
                    </FormField>
                    <Button type="submit" variant="outline" isLoading={resetPassword.isPending} disabled={!canSubmitAdminPasswordReset(password)} className="h-12">
                        {t('admin.users.reset.submit')}
                    </Button>
                </form>
                <p className="text-xs text-slate-500">{t('admin.users.reset.hint')}</p>
                <ErrorNotice error={resetPassword.error}/>
                {done && <Alert variant="success">{t('admin.users.reset.done')}</Alert>}
            </CardContent>
        </Card>
    );
}
