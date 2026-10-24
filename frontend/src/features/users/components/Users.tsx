"use client";
import Link from 'next/link';
import {auditDetail, displayLabel, formatDate} from "@/components/shared/presentation";
import {useState, type FormEvent} from 'react';
import {Download, Lock, LockOpen, UserPlus, X} from 'lucide-react';
import {useAdminAudit, useAdminMutations, useAdminUser, useAdminUserCounts, useAdminUsers, userStatuses} from "@/lib/query/admin";
import {adminService} from "@/lib/api/admin";
import {roles, type User, type UserRole, type UserStatus} from "@/types/admin";
import {useAuth} from '@/contexts/AuthContext';
import {EmptyState, ErrorNotice, PermissionGate, QueryState} from "@/components/admin/data/WorkspaceState";
import {Alert, Button, StatusBadge} from "@/components/admin/ui";
import {Metadata} from '@/components/data/Drawer';
import {Pagination} from "@/components/data/Pagination";
import {PermissionEditor} from "@/features/access/components/PermissionEditor";
import {cn} from '@/lib/utils';
import {useI18n} from '@/contexts/I18nContext';

const statusTone: Record<UserStatus | 'ALL', string> = {
    ALL: 'slate', ACTIVE: 'green', INACTIVE: 'amber', SUSPENDED: 'red'
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
    return <span className="user-avatar" aria-hidden="true"
                 style={{width: size, height: size, background: `hsl(${hue} 70% 94%)`, color: `hsl(${hue} 55% 32%)`}}>
        {user.avatarUrl ? <img src={user.avatarUrl} alt=""/> : initials}</span>;
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
        {!onSelect && <div className="user-stats">{userStatuses.map(item => {
            const key = item ?? 'ALL';
            return <button key={key} type="button" aria-pressed={status === item}
                           className={cn('user-stat', `user-stat-${statusTone[key]}`, status === item && 'user-stat-active')}
                           onClick={() => chooseStatus(item)}>
                <span>{item ? displayLabel(item) : t('admin.users.allAccounts')}</span>
                <strong>{counts[key] ?? '—'}</strong>
            </button>;
        })}</div>}
        <div className="data-table users-table">
            <div className="user-status-tabs" role="tablist" aria-label={t('admin.users.filterByStatus')}>{userStatuses.map(item => {
                const key = item ?? 'ALL';
                return <button key={key} type="button" role="tab" aria-selected={status === item}
                               className={cn('user-status-tab', status === item && 'user-status-tab-active')}
                               onClick={() => chooseStatus(item)}>
                    {item ? displayLabel(item) : t('admin.users.all')}<span>{counts[key] ?? '—'}</span></button>;
            })}</div>
            <form className="table-toolbar" onSubmit={e => {
                e.preventDefault();
                setKeyword(search.trim());
                setPage(0);
            }}><label className="table-search"><span className="sr-only">{t('admin.users.search')}</span><input
                placeholder={t('admin.users.searchPlaceholder')} value={search}
                onChange={e => setSearch(e.target.value)}/></label><Button type="submit" size="sm" variant="outline">{t('admin.users.searchButton')}</Button><label className="table-filter"><span className="sr-only">{t('admin.users.role')}</span><select
                value={role ?? ''} onChange={e => {
                setRole((e.target.value || undefined) as UserRole | undefined);
                setPage(0);
            }}>
                <option value="">{t('admin.users.allRoles')}</option>
                {roles.map(r => <option key={r} value={r}>{displayLabel(r)}</option>)}</select></label>
                {!onSelect && <div className="toolbar-actions">
                    <Button type="button" size="sm" variant="outline" leftIcon={<Download size={15}/>}
                            onClick={() => void exportCsv()}>{t('admin.users.export')}</Button>
                    {manage && <Button type="button" size="sm" leftIcon={<UserPlus size={15}/>}
                                       onClick={() => setCreating(true)}>{t('admin.users.create.open')}</Button>}
                </div>}</form>
            {manage && selected.size > 0 && <div className="bulk-bar" role="region" aria-label={t('admin.users.bulk.region')}>
                <strong>{t('admin.users.bulk.selected', {count: selected.size})}</strong>
                <Button size="sm" variant="danger" leftIcon={<Lock size={14}/>} disabled={mutations.bulkLock.isPending}
                        onClick={() => void bulk(true)}>{t('admin.users.bulk.lock')}</Button>
                <Button size="sm" variant="outline" leftIcon={<LockOpen size={14}/>} disabled={mutations.bulkLock.isPending}
                        onClick={() => void bulk(false)}>{t('admin.users.bulk.unlock')}</Button>
                <button type="button" className="bulk-clear" onClick={() => setSelected(new Set())}>
                    <X size={14} aria-hidden="true"/>{t('admin.users.bulk.clear')}</button>
            </div>}
            {(notice || mutations.bulkLock.error) && <div className="px-4 pt-3">{notice && <Alert variant="success">{notice}</Alert>}
                <ErrorNotice error={mutations.bulkLock.error}/></div>}
            <QueryState query={query}>{query.data?.content.length ?
                <div className="table-scroll" tabIndex={0} aria-label={t('admin.users.table')}>
                    <table className="console-table">
                        <thead>
                        <tr>{manage && <th className="select-col"><input type="checkbox" checked={allSelected}
                                                                       aria-label={t('admin.users.bulk.selectPage')}
                                                                       onChange={() => setSelected(allSelected ? new Set() : new Set(pageIds))}/></th>}
                            {['user', 'email', 'role', 'status', 'created', 'actions'].map(x => <th
                            key={x}>{t(`admin.users.col.${x}`)}</th>)}</tr>
                        </thead>
                        <tbody>{query.data.content.map(u => <tr key={u.id} className={cn(selected.has(u.id) && 'row-selected')}>
                            {manage && <td className="select-col">{u.id !== me?.id &&
                                <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)}
                                       aria-label={t('admin.users.bulk.selectRow', {name: u.username})}/>}</td>}
                            <td data-label={t('admin.users.col.user')}>
                                <div className="user-cell"><UserAvatar user={u}/>
                                    <div className="min-w-0"><strong className="table-primary">{u.fullName || u.username}</strong>
                                        <span className="table-secondary">@{u.username}</span></div>
                                </div>
                            </td>
                            <td data-label={t('admin.users.col.email')}>{u.email}</td>
                            <td data-label={t('admin.users.col.role')}><span className={cn('role-chip', `role-chip-${u.role.toLowerCase()}`)}>{displayLabel(u.role)}</span></td>
                            <td data-label={t('admin.users.col.status')}><div className="flex flex-wrap gap-1.5"><StatusBadge status={u.status}/>
                                {u.locked && <span className="status-badge status-badge-danger"><Lock size={11} aria-hidden="true"/>{t('admin.users.lockedBadge')}</span>}</div></td>
                            <td data-label={t('admin.users.col.created')}>{formatDate(u.createdAt)}</td>
                            <td data-label={t('admin.users.col.actions')}>{onSelect ?
                                <Button size="sm" variant="outline" onClick={() => onSelect(u)}>{t('admin.users.select')}</Button> :
                                <Link className="portal-row-action" href={`/admin/users/${u.id}`}>{t('admin.users.details')}</Link>}</td>
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
        if (form.password !== form.confirm) return setError(t('admin.users.create.mismatch'));
        setError('');
        try {
            const created = await create.mutateAsync({
                username: form.username.trim(), fullName: form.fullName.trim() || undefined, email: form.email.trim(),
                phoneNumber: form.phoneNumber.trim(), password: form.password, role: form.role
            });
            onCreated(created.username);
        } catch {/* The mutation error is shown in the dialog. */
        }
    };
    return <div className="admin-dialog-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <form className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="create-user-title"
              onSubmit={e => void submit(e)} onKeyDown={e => e.key === 'Escape' && onClose()}>
            <header><h2 id="create-user-title">{t('admin.users.create.title')}</h2>
                <button type="button" className="icon-button" aria-label={t('admin.users.create.cancel')} onClick={onClose}><X size={18}/></button></header>
            <div className="admin-dialog-grid">
                <label className="form-field">{t('admin.users.field.username')}<input required minLength={3} maxLength={50} autoFocus
                                                                                      value={form.username} onChange={set('username')} autoComplete="off"/></label>
                <label className="form-field">{t('admin.users.field.fullName')}<input maxLength={120} value={form.fullName} onChange={set('fullName')}/></label>
                <label className="form-field">{t('admin.users.field.email')}<input required type="email" value={form.email} onChange={set('email')}/></label>
                <label className="form-field">{t('admin.users.field.phone')}<input required type="tel" value={form.phoneNumber} onChange={set('phoneNumber')}/></label>
                <label className="form-field">{t('admin.users.field.role')}<select value={form.role} onChange={set('role')}>{roles.map(r =>
                    <option key={r} value={r}>{displayLabel(r)}</option>)}</select></label>
                <span/>
                <label className="form-field">{t('admin.users.create.password')}<input required type="password" minLength={8} maxLength={100}
                                                                                       autoComplete="new-password" value={form.password} onChange={set('password')}/></label>
                <label className="form-field">{t('admin.users.create.confirm')}<input required type="password" minLength={8} maxLength={100}
                                                                                      autoComplete="new-password" value={form.confirm} onChange={set('confirm')}/></label>
            </div>
            <p className="text-xs text-slate-500">{t('admin.users.create.hint')}</p>
            {error && <Alert variant="error">{error}</Alert>}
            <ErrorNotice error={create.error}/>
            <footer><Button type="button" variant="outline" onClick={onClose}>{t('admin.users.create.cancel')}</Button>
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
            <section className="console-panel p-5"><Metadata
                items={[[t('admin.users.field.username'), query.data.username], [t('admin.users.field.fullName'), query.data.fullName], [t('admin.users.field.email'), query.data.email], [t('admin.users.field.phone'), query.data.phoneNumber], [t('admin.users.field.role'), displayLabel(query.data.role)], [t('admin.users.field.status'),
                    <StatusBadge key="status"
                                 status={query.data.status}/>], [t('admin.users.field.created'), formatDate(query.data.createdAt)]]}/>
            </section>
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
    return <section className="console-panel p-5 space-y-4"><h2 className="font-semibold">{t('admin.users.manageAccount')}</h2>
        <div className="flex flex-wrap gap-3 items-end"><label className="form-field">{t('admin.users.role')}<select value={role}
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
    return <section className="console-panel p-5 space-y-3">
        <h2 className="font-semibold">{t('admin.users.reset.title')}</h2>
        <form className="flex flex-wrap gap-3 items-end" onSubmit={e => void submit(e)}>
            <label className="form-field">{t('admin.users.reset.newPassword')}<input type="password" required minLength={8} maxLength={100}
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
    return <section className="data-table audit-table">
        <header className="console-panel-header"><h2>{t('admin.users.activity.title')}</h2>
            <div className="segmented" role="group" aria-label={t('admin.users.activity.title')}>
                {(['account', 'actor'] as const).map(m => <button key={m} type="button" aria-pressed={mode === m}
                                                                className={cn(mode === m && 'segmented-active')}
                                                                onClick={() => {
                                                                    setMode(m);
                                                                    setPage(0);
                                                                }}>{t(`admin.users.activity.${m}`)}</button>)}
            </div>
        </header>
        <QueryState query={query}>{query.data?.content.length ? <>
            <ul className="activity-list">{query.data.content.map(log => <li key={log.id}>
                <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
                <span className="audit-action">{displayLabel(log.action)}</span>
                <span>{mode === 'actor' ? `${displayLabel(log.entityType)} · ${log.entityId}` : (log.actorUsername || t('admin.auditTable.system'))}</span>
                <span className="audit-details">{auditDetail(log.details)}</span>
            </li>)}</ul>
            <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/>
        </> : <EmptyState title={t('admin.users.activity.empty')}/>}</QueryState>
    </section>;
}
