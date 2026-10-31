'use client';

import {useState} from 'react';
import {KeyRound, LogOut, Search, ShieldOff} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {Alert, Button} from '@/components/ui';
import {EmptyState, ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {Pagination} from '@/components/data/Pagination';
import {displayLabel} from '@/lib/presentation';
import {roles} from '@/types/admin';
import {cn} from '@/lib/utils';
import {useSecurityActions, useSecuritySessions} from '@/hooks/security/useSecurity';
import {} from '@/components/security/SecurityShared';
import type {SecurityActionResult, SecuritySession, SessionFilter, SessionState} from '@/types/security/security.types';

const stateStyle: Record<SessionState, string> = {
    ACTIVE: 'bg-uav-blue-light text-uav-blue',
    EXPIRED: 'bg-slate-100 text-slate-600',
    REVOKED: 'bg-amber-100 text-amber-800',
    NONE: 'bg-slate-100 text-slate-500',
};

export function SecuritySessionsPanel() {
    const {t, formatDate} = useI18n();
    const {user: me} = useAuth();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<SessionFilter>({page: 0, keyword: '', activeOnly: false});
    const [notice, setNotice] = useState('');
    const query = useSecuritySessions(filter);

    const done = (result: SecurityActionResult) => {
        const parts = [t(`adminSecurity.sessions.done.${result.action}`, {count: result.affectedUsers, tokens: result.refreshTokensRevoked})];
        if (result.includesCurrentUser) parts.push(t('adminSecurity.sessions.done.selfSignedOut'));
        setNotice(parts.join(' '));
    };
    const {revokeUser, revokeAll, resetTwoFactor} = useSecurityActions({onSuccess: done});
    const busy = revokeUser.isPending || revokeAll.isPending || resetTwoFactor.isPending;
    const error = revokeUser.error ?? revokeAll.error ?? resetTwoFactor.error;

    const onRevoke = (s: SecuritySession) => {
        const self = s.userId === me?.id;
        const message = self ? t('adminSecurity.sessions.confirm.revokeSelf') : t('adminSecurity.sessions.confirm.revokeUser', {name: s.username});
        if (!window.confirm(message)) return;
        setNotice('');
        revokeUser.mutate(s.userId);
    };
    const onRevokeAll = () => {
        if (!window.confirm(t('adminSecurity.sessions.confirm.revokeAll'))) return;
        setNotice('');
        revokeAll.mutate();
    };
    const onReset2fa = (s: SecuritySession) => {
        const self = s.userId === me?.id;
        const base = t('adminSecurity.sessions.confirm.reset2fa', {name: s.username});
        if (!window.confirm(self ? `${base}\n\n${t('adminSecurity.sessions.confirm.reset2faSelf')}` : base)) return;
        const revoke = window.confirm(t('adminSecurity.sessions.confirm.reset2faRevoke', {name: s.username}));
        setNotice('');
        resetTwoFactor.mutate({id: s.userId, revoke});
    };

    return <div className="space-y-4">
        <section className="flex flex-wrap items-start gap-4 border border-l-4 border-slate-200 border-l-red-600 bg-white px-5 py-4">
            <div className="min-w-0 flex-1">
                <h2 className="m-0 text-[15px] font-bold text-slate-900">{t('adminSecurity.sessions.revokeAll.title')}</h2>
                <p className="m-0 mt-1 text-[13px] text-slate-600">{t('adminSecurity.sessions.revokeAll.description')}</p>
            </div>
            <Button variant="danger" size="sm" onClick={onRevokeAll} disabled={busy} isLoading={revokeAll.isPending}>
                <LogOut size={15} aria-hidden="true"/>{t('adminSecurity.sessions.revokeAll.action')}</Button>
        </section>

        {notice && <Alert variant="success">{notice}</Alert>}
        <ErrorNotice error={error}/>

        <div className="min-w-0 overflow-hidden border border-slate-200 bg-white">
            <form className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-4" onSubmit={e => {
                e.preventDefault();
                setFilter(f => ({...f, keyword: search.trim(), page: 0}));
            }}>
                <label className="flex min-h-[40px] min-w-[180px] max-w-[320px] flex-1 items-center gap-2 border border-slate-300 bg-white px-2.5 text-slate-500 focus-within:outline-2 focus-within:outline-primary">
                    <Search size={15} aria-hidden="true"/>
                    <span className="sr-only">{t('adminSecurity.sessions.filters.search')}</span>
                    <input className="min-h-[38px] w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none" value={search}
                           placeholder={t('adminSecurity.sessions.filters.searchPlaceholder')} onChange={e => setSearch(e.target.value)}/>
                </label>
                <Button type="submit" size="sm" variant="outline">{t('adminSecurity.sessions.filters.searchButton')}</Button>
                <label className="inline-flex items-center"><span className="sr-only">{t('adminSecurity.sessions.filters.role')}</span>
                    <select className="min-h-[40px] max-w-[200px] border border-slate-300 bg-white px-2.5 text-sm text-slate-900" value={filter.role ?? ''}
                            onChange={e => setFilter(f => ({...f, role: e.target.value || undefined, page: 0}))}>
                        <option value="">{t('adminSecurity.sessions.filters.allRoles')}</option>
                        {roles.map(r => <option key={r} value={r}>{displayLabel(r)}</option>)}
                    </select></label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                    <input type="checkbox" checked={filter.activeOnly} onChange={e => setFilter(f => ({...f, activeOnly: e.target.checked, page: 0}))}/>
                    {t('adminSecurity.sessions.filters.activeOnly')}</label>
            </form>
            <QueryState query={query}>{query.data && (query.data.content.length === 0
                ? <EmptyState title={t('adminSecurity.sessions.empty')}/>
                : <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
                        <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                            <th scope="col" className="px-4 py-2.5 font-semibold">{t('adminSecurity.sessions.columns.user')}</th>
                            <th scope="col" className="px-4 py-2.5 font-semibold">{t('adminSecurity.sessions.columns.role')}</th>
                            <th scope="col" className="px-4 py-2.5 font-semibold">{t('adminSecurity.sessions.columns.session')}</th>
                            <th scope="col" className="px-4 py-2.5 font-semibold">{t('adminSecurity.sessions.columns.twoFactor')}</th>
                            <th scope="col" className="px-4 py-2.5 font-semibold">{t('adminSecurity.sessions.columns.lastRevoked')}</th>
                            <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t('adminSecurity.sessions.columns.actions')}</th>
                        </tr>
                        </thead>
                        <tbody>{query.data.content.map(s => {
                            const self = s.userId === me?.id;
                            return <tr key={s.userId} className="border-t border-slate-100 align-top">
                                <td className="px-4 py-3">
                                    <strong className="block text-slate-900">{s.fullName || s.username}
                                        {self && <span className="ml-1.5 bg-slate-900 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">{t('adminSecurity.sessions.you')}</span>}</strong>
                                    <span className="block text-xs text-slate-500">{s.username} · {s.email}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-700">{displayLabel(s.role)}</td>
                                <td className="px-4 py-3">
                                    <span className={cn('inline-block px-1.5 py-0.5 text-[11.5px] font-semibold', stateStyle[s.sessionState])}>
                                        {t(`adminSecurity.sessions.state.${s.sessionState}`)}</span>
                                    {s.sessionCreatedAt && <span className="mt-1 block text-xs text-slate-500">{t('adminSecurity.sessions.signedIn', {time: formatDate(s.sessionCreatedAt)})}</span>}
                                    {s.sessionExpiresAt && <span className="block text-xs text-slate-500">{t('adminSecurity.sessions.expires', {time: formatDate(s.sessionExpiresAt)})}</span>}
                                </td>
                                <td className="px-4 py-3">
                                    {s.twoFactorEnabled
                                        ? <span className="inline-flex items-center gap-1 bg-uav-blue-light px-1.5 py-0.5 text-[11.5px] font-semibold text-uav-blue">
                                            <KeyRound size={12} aria-hidden="true"/>{t(`adminSecurity.sessions.twoFactorMethod.${s.twoFactorMethod ?? 'EMAIL'}`)}</span>
                                        : <span className="inline-block bg-slate-100 px-1.5 py-0.5 text-[11.5px] font-semibold text-slate-500">{t('adminSecurity.sessions.twoFactorOff')}</span>}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500">{s.sessionsRevokedAt
                                    ? t('adminSecurity.sessions.revokedBy', {time: formatDate(s.sessionsRevokedAt), name: s.sessionsRevokedBy ?? '—'})
                                    : '—'}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap justify-end gap-1.5">
                                        <Button size="sm" variant="outline" disabled={busy} onClick={() => onRevoke(s)}
                                                title={self ? t('adminSecurity.sessions.selfWarning') : undefined}>
                                            <LogOut size={14} aria-hidden="true"/>{t('adminSecurity.sessions.actions.revoke')}</Button>
                                        {s.twoFactorEnabled && <Button size="sm" variant="outline" disabled={busy} onClick={() => onReset2fa(s)}>
                                            <ShieldOff size={14} aria-hidden="true"/>{t('adminSecurity.sessions.actions.reset2fa')}</Button>}
                                    </div>
                                </td>
                            </tr>;
                        })}</tbody>
                    </table>
                </div>)}</QueryState>
        </div>
        {query.data && <Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.totalElements}
                                   onChange={page => setFilter(f => ({...f, page}))}/>}
    </div>;
}
