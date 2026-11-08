"use client";

import {useState} from 'react';
import {auditDetail, displayLabel, formatDate} from '@/lib/presentation';
import {useAdminAudit} from '@/hooks/audit/useAdminAudit';
import {useAdminMutations} from '@/hooks/user/useAdminUsers';
import {roles, type User, type UserRole} from '@/types/admin';
import {useAuth} from '@/providers/AuthContext';
import {confirmDialog} from '@/providers/ConfirmContext';
import {EmptyState, ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, FormField, Select} from '@/components/ui';
import {Pagination} from '@/components/data/Pagination';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';

export function UserAccountActions({user}: { user: User }) {
    const [role, setRole] = useState(user.role);
    const [message, setMessage] = useState('');
    const mutations = useAdminMutations();
    const {t} = useI18n();
    const {can} = useAuth();
    const pending = mutations.lock.isPending || mutations.unlock.isPending || mutations.role.isPending;

    const act = async (action: () => Promise<unknown>, prompt: string) => {
        if (!(await confirmDialog(prompt))) return;
        setMessage('');
        try {
            await action();
            setMessage(t('admin.users.saved'));
        } catch {
            /* Mutation errors remain visible. */
        }
    };

    return (
        <Card className="border-border">
            <CardContent className="space-y-4">
                <h2 className="font-semibold text-foreground">{t('admin.users.manageAccount')}</h2>
                <div className="flex flex-wrap items-end gap-3">
                    {can('USER_PERMISSION_MANAGE') && (
                        <>
                            <FormField id="account-role-select" label={t('admin.users.role')} optional={false} className="w-auto min-w-[180px]">
                                <Select id="account-role-select" value={role} onChange={e => setRole(e.target.value as UserRole)} disabled={pending}>
                                    {roles.map(r => <option key={r} value={r}>{displayLabel(r)}</option>)}
                                </Select>
                            </FormField>
                            <Button
                                variant="outline"
                                disabled={pending || role === user.role}
                                onClick={() => void act(
                                    () => mutations.role.mutateAsync({id: user.id, nextRole: role}),
                                    t('admin.users.changeRoleConfirm', {name: user.username, role: displayLabel(role)}),
                                )}
                            >
                                {t('admin.users.saveRole')}
                            </Button>
                        </>
                    )}
                    {user.locked ? (
                        can('USER_UNLOCK') && (
                            <Button
                                variant="outline"
                                disabled={pending}
                                onClick={() => void act(() => mutations.unlock.mutateAsync(user.id), t('admin.users.unlockConfirm', {name: user.username}))}
                            >
                                {t('admin.users.unlock')}
                            </Button>
                        )
                    ) : (
                        can('USER_LOCK') && (
                            <Button
                                variant="danger"
                                disabled={pending}
                                onClick={() => void act(() => mutations.lock.mutateAsync(user.id), t('admin.users.lockConfirm', {name: user.username}))}
                            >
                                {t('admin.users.lock')}
                            </Button>
                        )
                    )}
                </div>
                <p className="text-xs text-slate-500">{t('admin.users.lockHint')}</p>
                <ErrorNotice error={mutations.lock.error || mutations.unlock.error || mutations.role.error}/>
                {message && <Alert variant="success">{message}</Alert>}
            </CardContent>
        </Card>
    );
}

export function UserActivitySection({user}: { user: User }) {
    const {t} = useI18n();
    const [mode, setMode] = useState<'account' | 'actor'>('account');
    const [page, setPage] = useState(0);
    const filters = mode === 'account' ? {entityType: 'USER', entityId: String(user.id)} : {actor: user.username};
    const query = useAdminAudit(page, 10, filters);

    return (
        <Card className="border-border">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-border px-[18px] py-3.5">
                <CardTitle className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.users.activity.title')}</CardTitle>
                <div className="inline-flex rounded-panel border border-border bg-card p-[3px]" role="group" aria-label={t('admin.users.activity.title')}>
                    {(['account', 'actor'] as const).map(m => (
                        <Button
                            key={m}
                            type="button"
                            size="sm"
                            variant={mode === m ? 'secondary' : 'ghost'}
                            aria-pressed={mode === m}
                            className={cn(
                                'h-7 px-3 text-xs',
                                mode === m ? 'bg-uav-red-light font-semibold text-primary hover:bg-uav-red-light' : 'text-muted hover:text-foreground',
                            )}
                            onClick={() => {
                                setMode(m);
                                setPage(0);
                            }}
                        >
                            {t(`admin.users.activity.${m}`)}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <QueryState query={query}>
                {query.data?.content.length ? (
                    <>
                        <ul className="m-0 list-none px-[18px] pb-2 pt-1">
                            {query.data.content.map(log => (
                                <li key={log.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2.5 text-[13px] last:border-b-0 sm:grid-cols-[130px_auto_minmax(0,1fr)_minmax(0,1.4fr)]">
                                    <time dateTime={log.createdAt} className="text-xs text-muted">{formatDate(log.createdAt)}</time>
                                    <Badge variant="primary" className="w-fit">{displayLabel(log.action)}</Badge>
                                    <span>{mode === 'actor' ? `${displayLabel(log.entityType)} · ${log.entityId}` : (log.actorUsername || t('admin.auditTable.system'))}</span>
                                    <span className="max-w-[320px] text-[13px] text-foreground">{auditDetail(log.details)}</span>
                                </li>
                            ))}
                        </ul>
                        <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/>
                    </>
                ) : (
                    <EmptyState title={t('admin.users.activity.empty')}/>
                )}
            </QueryState>
        </Card>
    );
}
