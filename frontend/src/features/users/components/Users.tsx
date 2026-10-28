"use client";
import Link from 'next/link';
import {auditDetail, displayLabel, formatDate} from "@/components/shared/presentation";
import {useState, type FormEvent} from 'react';
import {Download, Lock, LockOpen, Search, UserPlus, X} from 'lucide-react';
import {useAdminAudit, useAdminMutations, useAdminUser, useAdminUserCounts, useAdminUsers, userStatuses} from "@/lib/query/admin";
import {adminService} from "@/lib/api/admin";
import {roles, type User, type UserRole, type UserStatus} from "@/types/admin";
import {useAuth} from '@/contexts/AuthContext';
import {EmptyState, ErrorNotice, PermissionGate, QueryState} from "@/components/data/WorkspaceState";
import {Alert, Button, StatusBadge} from "@/components/ui";
import {Metadata} from '@/components/data/Drawer';
import {Pagination} from "@/components/data/Pagination";
import {PermissionEditor} from "@/features/access/components/PermissionEditor";
import {OptionalMark, RequiredMark} from "@/components/shared/RequiredMark";
import {cn} from '@/lib/utils';
import {toUserSlug} from '@/lib/url-slugs';
import {useI18n} from '@/contexts/I18nContext';
import {avatarSrc} from '@/components/shared/Avatar';
import {CustomerBillingProfileCard} from '@/features/billing/components/CustomerBillingProfileCard';

const roleChipStyles: Record<string, string> = {
    ROLE_ADMIN: 'bg-red-100 text-red-800',
    ROLE_COMMANDER: 'bg-violet-100 text-violet-800',
    ROLE_OPERATOR: 'bg-sky-100 text-sky-800',
    ROLE_PILOT: 'bg-uav-blue-light text-uav-blue',
};

/** Stable avatar tint per account so the same person keeps the same colour across pages. */
function avatarHue(seed: string) {
    let hash = 0;
    for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
    return hash;
}

export function UserAvatar({user, size = 36}: { user: Pick<User, 'username' | 'fullName' | 'avatarUrl'>; size?: number }) {
    const name = user.fullName || user.username;
    const initials = name.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase();
    const hue = avatarHue(user.username);
    return <span className="inline-flex flex-none items-center justify-center overflow-hidden rounded-full text-[13px] font-bold" aria-hidden="true"
                 style={{width: size, height: size, background: `hsl(${hue} 70% 94%)`, color: `hsl(${hue} 55% 32%)`}}>
        {user.avatarUrl ? <img src={avatarSrc(user.avatarUrl)} alt="" className="h-full w-full object-cover"/> : initials}</span>;
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
    const manage = !onSelect && can('USER_MANAGE');
    const query = useAdminUsers(page, keyword, role, status);
    const counts = useAdminUserCounts(keyword, role);
    const chooseStatus = (next?: UserStatus) => {
        setStatus(next);
        setPage(0);
        setSelected(new Set());
    };
    const pageIds = (query.data?.content ?? []).filter(u => u.id !== me?.id).map(u => u.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
    const toggle = (id: number) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const bulk = async (locked: boolean) => {
        const ids = [...selected];
        if (!window.confirm(t(locked ? 'admin.users.bulk.lockConfirm' : 'admin.users.bulk.unlockConfirm', {count: ids.length}))) return;
        setNotice('');
        try {
            const result = await mutations.bulkLock.mutateAsync({ids, locked});
            const self = result.skipped.filter(s => s.reason === 'SELF').length;
            setNotice([t('admin.users.bulk.done', {count: result.processed.length}), self ? t('admin.users.bulk.skippedSelf') : ''].filter(Boolean).join(' '));
            setSelected(new Set());
        } catch {/* The mutation error is shown below. */
        }
    };
    const exportCsv = async () => {
        const csv = await adminService.exportUsers({keyword, role, status});
        const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
        const link = Object.assign(document.createElement('a'), {href: url, download: `users-${new Date().toISOString().slice(0, 10)}.csv`});
        link.click();
        URL.revokeObjectURL(url);
    };
    return <div className="space-y-5">
        <div className="min-w-0 overflow-hidden rounded-panel border border-border bg-card">
            <div className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-2.5" role="tablist" aria-label={t('admin.users.filterByStatus')}>{userStatuses.map(item => {
                const key = item ?? 'ALL';
                return <button key={key} type="button" role="tab" aria-selected={status === item}
                               className={cn(
                                   'inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-0 border-b-2 bg-transparent px-2.5 pb-2.5 pt-2 text-[13px] transition-colors',
                                   status === item ? 'border-b-primary font-semibold text-primary' : 'border-b-transparent font-medium text-muted hover:text-foreground'
                               )}
                               onClick={() => chooseStatus(item)}>
                    {item ? displayLabel(item) : t('admin.users.all')}<span className={cn(
                        'min-w-[20px] rounded-panel px-1.5 text-center text-[11.5px] leading-[18px]',
                        status === item ? 'bg-uav-red-light text-primary' : 'bg-slate-100 text-muted'
                    )}>{counts[key] ?? '—'}</span></button>;
            })}</div>
            <form className="flex flex-wrap items-center gap-2 border-b border-border p-4" onSubmit={e => {
                e.preventDefault();
                setKeyword(search.trim());
                setPage(0);
            }}><label className="flex min-h-[44px] min-w-[160px] max-w-[320px] flex-1 items-center gap-2 rounded-panel border border-border-input bg-card px-2.5 text-muted focus-within:outline-2 focus-within:outline-primary"><Search size={16} aria-hidden="true"/><span className="sr-only">{t('admin.users.search')}</span><input
                className="min-h-[42px] w-full min-w-0 bg-transparent text-sm text-foreground outline-none"
                placeholder={t('admin.users.searchPlaceholder')} value={search}
                onChange={e => setSearch(e.target.value)} enterKeyHint="search"/></label><label className="inline-flex items-center"><span className="sr-only">{t('admin.users.role')}</span><select
                className="min-h-[44px] max-w-[200px] rounded-control border border-border-input bg-card px-2.5 text-sm text-foreground"
                value={role ?? ''} onChange={e => {
                setRole((e.target.value || undefined) as UserRole | undefined);
                setPage(0);
            }}>
                <option value="">{t('admin.users.allRoles')}</option>
                {roles.map(r => <option key={r} value={r}>{displayLabel(r)}</option>)}</select></label>
                {!onSelect && <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                    <Button type="button" size="sm" variant="outline" leftIcon={<Download size={15}/>}
                            onClick={() => void exportCsv()}>{t('admin.users.export')}</Button>
                    {manage && <Button type="button" size="sm" leftIcon={<UserPlus size={15}/>}
                                       onClick={() => setCreating(true)}>{t('admin.users.create.open')}</Button>}
                </div>}</form>
            {manage && selected.size > 0 && <div className="mx-4 mt-3 flex flex-wrap items-center gap-2.5 rounded-panel bg-uav-red-light px-3.5 py-2.5 text-[13px]" role="region" aria-label={t('admin.users.bulk.region')}>
                <strong>{t('admin.users.bulk.selected', {count: selected.size})}</strong>
                <Button size="sm" variant="danger" leftIcon={<Lock size={14}/>} disabled={mutations.bulkLock.isPending}
                        onClick={() => void bulk(true)}>{t('admin.users.bulk.lock')}</Button>
                <Button size="sm" variant="outline" leftIcon={<LockOpen size={14}/>} disabled={mutations.bulkLock.isPending}
                        onClick={() => void bulk(false)}>{t('admin.users.bulk.unlock')}</Button>
                <button type="button" className="ml-auto inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent text-[12.5px] text-muted hover:text-foreground" onClick={() => setSelected(new Set())}>
                    <X size={14} aria-hidden="true"/>{t('admin.users.bulk.clear')}</button>
            </div>}
            {(notice || mutations.bulkLock.error) && <div className="px-4 pt-3">{notice && <Alert variant="success">{notice}</Alert>}
                <ErrorNotice error={mutations.bulkLock.error}/></div>}
            <QueryState query={query}>{query.data?.content.length ?
                <div className="max-h-[640px] overflow-auto" tabIndex={0} aria-label={t('admin.users.table')}>
                    <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                        <thead>
                        <tr>{manage && <th className="sticky top-0 z-10 w-10 border-b border-border bg-slate-50 px-4 py-3 text-center"><input type="checkbox" checked={allSelected}
                                                                       aria-label={t('admin.users.bulk.selectPage')}
                                                                       onChange={() => setSelected(allSelected ? new Set() : new Set(pageIds))}/></th>}
                            {['user', 'email', 'role', 'status', 'created', 'actions'].map(x => <th
                            key={x} className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t(`admin.users.col.${x}`)}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-border">{query.data.content.map(u => <tr key={u.id} className={cn('transition-colors hover:bg-background', selected.has(u.id) && 'bg-red-50/50')}>
                            {manage && <td className="w-10 px-4 py-3.5 text-center align-middle">{u.id !== me?.id &&
                                <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)}
                                       aria-label={t('admin.users.bulk.selectRow', {name: u.username})}/>}</td>}
                            <td data-label={t('admin.users.col.user')} className="px-4 py-3.5 align-middle text-foreground">
                                <div className="flex items-center gap-2.5"><UserAvatar user={u}/>
                                    <div className="flex min-w-0 flex-col"><strong className="font-semibold text-foreground">{u.fullName || u.username}</strong>
                                        <span className="mt-0.5 block text-xs text-muted">@{u.username}</span></div>
                                </div>
                            </td>
                            <td data-label={t('admin.users.col.email')} className="px-4 py-3.5 align-middle text-foreground">{u.email}</td>
                            <td data-label={t('admin.users.col.role')} className="px-4 py-3.5 align-middle text-foreground"><span className={cn('inline-flex whitespace-nowrap rounded-badge px-2.5 py-0.5 text-xs font-semibold', roleChipStyles[u.role] ?? 'bg-slate-100 text-slate-600')}>{displayLabel(u.role)}</span></td>
                            <td data-label={t('admin.users.col.status')} className="px-4 py-3.5 align-middle text-foreground"><div className="flex flex-wrap gap-1.5">{!u.locked && <StatusBadge status={u.status}/>}
                                {u.locked && <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-panel border border-red-200 bg-red-50 px-2 py-[3px] text-xs font-semibold text-red-700"><Lock size={11} aria-hidden="true"/>{t('admin.users.lockedBadge')}</span>}</div></td>
                            <td data-label={t('admin.users.col.created')} className="px-4 py-3.5 align-middle text-foreground">{formatDate(u.createdAt)}</td>
                            <td data-label={t('admin.users.col.actions')} className="px-4 py-3.5 align-middle text-foreground">{onSelect ?
                                <Button size="sm" variant="outline" onClick={() => onSelect(u)}>{t('admin.users.select')}</Button> :
                                <Link className="text-xs font-semibold text-primary hover:underline" href={`/admin/users/${toUserSlug(u)}`}>{t('admin.users.details')}</Link>}</td>
                        </tr>)}</tbody>
                    </table>
                </div> : <EmptyState title={t('admin.users.emptyTitle')}
                                     detail={status || keyword || role ? t('admin.users.emptyDetail') : undefined}/>}{query.data &&
                <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements}
                            onChange={setPage}/>}</QueryState></div>
        {creating && <CreateUserDialog onClose={() => setCreating(false)} onCreated={name => {
            setCreating(false);
            setNotice(t('admin.users.create.done', {name}));
        }}/>}
    </div>;
}

const emptyForm = {username: '', fullName: '', email: '', phoneNumber: '', password: '', confirm: '', role: 'ROLE_PILOT' as UserRole};

function CreateUserDialog({onClose, onCreated}: { onClose: () => void; onCreated: (name: string) => void }) {
    const {t} = useI18n();
    const {create} = useAdminMutations();
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const set = (field: keyof typeof emptyForm) => (e: { target: { value: string } }) => setForm(f => ({...f, [field]: e.target.value}));
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const created = await create.mutateAsync({
                username: form.username.trim(), fullName: form.fullName.trim() || undefined, email: form.email.trim(),
                phoneNumber: form.phoneNumber.trim(), password: form.password, confirmPassword: form.confirm, role: form.role
            });
            onCreated(created.username);
        } catch {/* The mutation error is shown in the dialog. */
        }
    };
    const inputClass = "min-h-[44px] w-full rounded-control border border-border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground";
    return <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/45 p-4" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <form className="flex max-h-[calc(100dvh-32px)] w-[min(640px,100%)] flex-col gap-3.5 overflow-y-auto rounded-overlay bg-card px-[22px] py-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="create-user-title"
              onSubmit={e => void submit(e)} onKeyDown={e => e.key === 'Escape' && onClose()}>
            <header className="flex items-center justify-between gap-2.5"><h2 id="create-user-title" className="text-[17px] font-bold text-foreground">{t('admin.users.create.title')}</h2>
                <button type="button" className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-control border border-border bg-card text-muted transition-colors hover:border-primary hover:bg-uav-red-light hover:text-primary" aria-label={t('admin.users.create.cancel')} onClick={onClose}><X size={18}/></button></header>
            <div className="grid grid-cols-1 gap-x-3.5 gap-y-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-foreground"><span>{t('admin.users.field.username')}<RequiredMark/></span><input className={inputClass} aria-required autoFocus
                                                                                      value={form.username} onChange={set('username')} autoComplete="off"/></label>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-foreground"><span>{t('admin.users.field.fullName')}<OptionalMark/></span><input className={inputClass} value={form.fullName} onChange={set('fullName')}/></label>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-foreground"><span>{t('admin.users.field.email')}<RequiredMark/></span><input className={inputClass} aria-required type="email" value={form.email} onChange={set('email')}/></label>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-foreground"><span>{t('admin.users.field.phone')}<RequiredMark/></span><input className={inputClass} aria-required type="tel" value={form.phoneNumber} onChange={set('phoneNumber')}/></label>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-foreground"><span>{t('admin.users.field.role')}<RequiredMark/></span><select className={inputClass} value={form.role} onChange={set('role')}>{roles.map(r =>
                    <option key={r} value={r}>{displayLabel(r)}</option>)}</select></label>
                <span/>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-foreground"><span>{t('admin.users.create.password')}<RequiredMark/></span><input className={inputClass} aria-required type="password"
                                                                                       autoComplete="new-password" value={form.password} onChange={set('password')}/></label>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-foreground"><span>{t('admin.users.create.confirm')}<RequiredMark/></span><input className={inputClass} aria-required type="password"
                                                                                      autoComplete="new-password" value={form.confirm} onChange={set('confirm')}/></label>
            </div>
            <p className="text-xs text-slate-500">{t('admin.users.create.hint')}</p>
            {error && <Alert variant="error">{error}</Alert>}
            <ErrorNotice error={create.error}/>
            <footer className="flex items-center justify-end gap-2.5"><Button type="button" variant="outline" onClick={onClose}>{t('admin.users.create.cancel')}</Button>
                <Button type="submit" disabled={create.isPending}>{t('admin.users.create.submit')}</Button></footer>
        </form>
    </div>;
}

export function UserDetail({id}: { id: number }) {
    const query = useAdminUser(id);
    const {can} = useAuth();
    const {t} = useI18n();
    if (!Number.isSafeInteger(id) || id <= 0) return <Alert variant="error">{t('admin.users.invalidId')}</Alert>;
    return <QueryState query={query}>{query.data &&
        <div className="space-y-6"><Link href="/admin/users" className="text-primary underline">{t('admin.users.back')}</Link>
            <section className="min-w-0 rounded-panel border border-border bg-card p-5"><Metadata
                items={[[t('admin.users.field.username'), query.data.username], [t('admin.users.field.fullName'), query.data.fullName], [t('admin.users.field.email'), query.data.email], [t('admin.users.field.phone'), query.data.phoneNumber], [t('admin.users.field.role'), displayLabel(query.data.role)], [t('admin.users.field.status'),
                    <StatusBadge key="status"
                                 status={query.data.locked ? 'LOCKED' : query.data.status}/>], [t('admin.users.field.created'), formatDate(query.data.createdAt)]]}/>
            </section>
            {can('USER_READ') && <CustomerBillingProfileCard userId={query.data.id}/>}
            {can('USER_MANAGE') && <AccountActions key={`${query.data.id}:${query.data.role}:${query.data.status}`}
                                                   user={query.data}/>}
            {can('USER_MANAGE') && <PasswordReset user={query.data}/>}
            {can('AUDIT_READ') && <UserActivity user={query.data}/>}<PermissionGate
                code="PERMISSION_MANAGE"><PermissionEditor target={query.data}/></PermissionGate></div>}</QueryState>;
}

function AccountActions({user}: { user: User }) {
    const [role, setRole] = useState(user.role);
    const [message, setMessage] = useState('');
    const mutations = useAdminMutations();
    const {t} = useI18n();
    const pending = mutations.lock.isPending || mutations.unlock.isPending || mutations.role.isPending;
    const act = async (action: () => Promise<unknown>, prompt: string) => {
        if (!window.confirm(prompt)) return;
        setMessage('');
        try {
            await action();
            setMessage(t('admin.users.saved'));
        } catch {/* Mutation errors remain visible. */
        }
    };
    return <section className="min-w-0 space-y-4 rounded-panel border border-border bg-card p-5"><h2 className="font-semibold">{t('admin.users.manageAccount')}</h2>
        <div className="flex flex-wrap items-end gap-3"><label className="flex flex-col gap-1.5 text-[13px] font-semibold text-foreground">{t('admin.users.role')}<select className="min-h-[44px] w-full rounded-control border border-border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground disabled:opacity-55" value={role}
                                                                                                     onChange={e => setRole(e.target.value as UserRole)}
                                                                                                     disabled={pending}>{roles.map(r =>
            <option key={r} value={r}>{displayLabel(r)}</option>)}</select></label><Button variant="outline"
                                                                                           disabled={pending || role === user.role}
                                                                                           onClick={() => void act(() => mutations.role.mutateAsync({
                                                                                               id: user.id,
                                                                                               nextRole: role
                                                                                           }), t('admin.users.changeRoleConfirm', {name: user.username, role: displayLabel(role)}))}>{t('admin.users.saveRole')}</Button><Button variant="danger" disabled={pending}
                                    onClick={() => void act(() => mutations.lock.mutateAsync(user.id), t('admin.users.lockConfirm', {name: user.username}))}>{t('admin.users.lock')}</Button><Button variant="outline" disabled={pending}
                                      onClick={() => void act(() => mutations.unlock.mutateAsync(user.id), t('admin.users.unlockConfirm', {name: user.username}))}>{t('admin.users.unlock')}</Button></div>
        <p className="text-sm text-slate-600">{t('admin.users.lockHint')}</p><ErrorNotice
            error={mutations.lock.error || mutations.unlock.error || mutations.role.error}/>{message &&
            <Alert variant="success">{message}</Alert>}</section>;
}

function PasswordReset({user}: { user: User }) {
    const {t} = useI18n();
    const {resetPassword} = useAdminMutations();
    const [password, setPassword] = useState('');
    const [done, setDone] = useState(false);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!window.confirm(t('admin.users.reset.confirm', {name: user.username}))) return;
        setDone(false);
        try {
            await resetPassword.mutateAsync({id: user.id, password});
            setPassword('');
            setDone(true);
        } catch {/* The mutation error is shown below. */
        }
    };
    return <section className="min-w-0 space-y-3 rounded-panel border border-border bg-card p-5">
        <h2 className="font-semibold">{t('admin.users.reset.title')}</h2>
        <form className="flex flex-wrap items-end gap-3" onSubmit={e => void submit(e)}>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-foreground"><span>{t('admin.users.reset.newPassword')}<RequiredMark/></span><input className="min-h-[44px] w-full rounded-control border border-border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground" type="password" aria-required
                                                                                    autoComplete="new-password" value={password}
                                                                                    onChange={e => setPassword(e.target.value)}/></label>
            <Button type="submit" variant="outline" disabled={resetPassword.isPending}>{t('admin.users.reset.submit')}</Button>
        </form>
        <p className="text-sm text-slate-600">{t('admin.users.reset.hint')}</p>
        <ErrorNotice error={resetPassword.error}/>
        {done && <Alert variant="success">{t('admin.users.reset.done')}</Alert>}
    </section>;
}

function UserActivity({user}: { user: User }) {
    const {t} = useI18n();
    const [mode, setMode] = useState<'account' | 'actor'>('account');
    const [page, setPage] = useState(0);
    const filters = mode === 'account' ? {entityType: 'USER', entityId: String(user.id)} : {actor: user.username};
    const query = useAdminAudit(page, 10, filters);
    return <section className="min-w-0 overflow-hidden rounded-panel border border-border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.users.activity.title')}</h2>
            <div className="inline-flex rounded-panel border border-border bg-card p-[3px]" role="group" aria-label={t('admin.users.activity.title')}>
                {(['account', 'actor'] as const).map(m => <button key={m} type="button" aria-pressed={mode === m}
                                                                className={cn('cursor-pointer rounded-control border-0 px-3 py-[5px] text-[12.5px] font-medium text-muted transition-colors', mode === m ? 'bg-uav-red-light font-semibold text-primary' : 'bg-transparent hover:text-foreground')}
                                                                onClick={() => {
                                                                    setMode(m);
                                                                    setPage(0);
                                                                }}>{t(`admin.users.activity.${m}`)}</button>)}
            </div>
        </header>
        <QueryState query={query}>{query.data?.content.length ? <>
            <ul className="m-0 list-none px-[18px] pb-2 pt-1">{query.data.content.map(log => <li key={log.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2.5 text-[13px] last:border-b-0 sm:grid-cols-[130px_auto_minmax(0,1fr)_minmax(0,1.4fr)]">
                <time dateTime={log.createdAt} className="text-xs text-muted">{formatDate(log.createdAt)}</time>
                <span className="inline-block w-fit whitespace-nowrap rounded-badge bg-uav-red-light px-2 py-1 text-xs font-medium text-primary">{displayLabel(log.action)}</span>
                <span>{mode === 'actor' ? `${displayLabel(log.entityType)} · ${log.entityId}` : (log.actorUsername || t('admin.auditTable.system'))}</span>
                <span className="max-w-[320px] text-[13px] text-foreground">{auditDetail(log.details)}</span>
            </li>)}</ul>
            <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/>
        </> : <EmptyState title={t('admin.users.activity.empty')}/>}</QueryState>
    </section>;
}
