"use client";
import {displayLabel, permissionLabel} from "@/components/shared/presentation";
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useAuth} from '@/contexts/AuthContext';
import {Alert, Button} from "@/components/ui";
import {QueryState} from "@/components/data/WorkspaceState";
import {useAdminInvalidation, useAdminReferenceData} from "@/lib/query/admin";
import {adminService} from "@/lib/api/admin";
import {type Override, permissionState, saveChanges} from "@/features/access/utils/permission-model";
import type {Permission, RoleTemplate, User} from "@/types/admin";
import {Users} from "@/features/users/components/Users";
import {useI18n} from '@/contexts/I18nContext';

export function AccessControl() {
    const [selected, setSelected] = useState<User | null>(null);
    const {can} = useAuth();
    const {t} = useI18n();
    return <div className="space-y-6">{selected ? <><Button variant="outline" onClick={() => {
        if (window.confirm(t('admin.access.leaveConfirm'))) setSelected(null);
    }}>{t('admin.access.chooseOtherUser')}</Button><h2
        className="text-lg font-semibold">{selected.username} · {displayLabel(selected.role)}</h2><PermissionEditor
        key={selected.id} target={selected}/></> : can('USER_READ') ? <Users onSelect={setSelected}/> :
        <Alert variant="warning">{t('admin.access.needUserRead')}</Alert>}</div>;
}

export function PermissionEditor({target}: { target: User }) {
    const {user, can} = useAuth();
    const {permissions, templates} = useAdminReferenceData();
    const overrides = useQuery({
        queryKey: ['session', user?.id, 'admin-user-permissions', target.id],
        queryFn: ({signal}) => adminService.userPermissions(target.id, signal),
        enabled: can('PERMISSION_MANAGE')
    });
    const template = templates.data?.find(t => t.role === target.role);
    return <QueryState query={permissions}><QueryState query={templates}><QueryState
        query={overrides}>{permissions.data && overrides.data &&
        <Matrix permissions={permissions.data} template={template} target={target}
                values={Object.fromEntries(overrides.data.map(p => [p.code, p.granted]))}/>}</QueryState></QueryState></QueryState>;
}

export function TemplateEditor() {
    const {permissions, templates} = useAdminReferenceData();
    const [role, setRole] = useState('');
    const {t} = useI18n();
    const template = templates.data?.find(item => item.role === role) ?? templates.data?.[0];
    return <QueryState query={permissions}><QueryState query={templates}>
        <div className="space-y-5"><label className="flex max-w-md flex-col gap-1.5 text-[13px] font-semibold text-foreground">{t('admin.access.roleTemplate')}<select
            className="min-h-[44px] w-full rounded-[10px] border border-border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground"
            value={template?.role ?? ''} onChange={e => {
            if (window.confirm(t('admin.access.switchTemplateConfirm'))) setRole(e.target.value);
        }}>{templates.data?.map(item => <option key={item.role}
                                             value={item.role}>{displayLabel(item.role)}</option>)}</select></label>{template && permissions.data ?
            <Matrix key={template.role} template={template} permissions={permissions.data}
                    values={Object.fromEntries(template.permissions.map(code => [code, true]))}/> :
            <Alert>{t('admin.access.noTemplates')}</Alert>}</div>
    </QueryState></QueryState>;
}

function Matrix({permissions, template, target, values}: {
    permissions: Permission[];
    template?: RoleTemplate;
    target?: User;
    values: Record<string, boolean>
}) {
    const [draft, setDraft] = useState<Record<string, Override>>({});
    const [filter, setFilter] = useState('');
    const {t} = useI18n();
    const invalidate = useAdminInvalidation();
    const changes = Object.entries(draft).filter(([code, value]) => value !== (values[code] ?? (target ? null : false))).map(([code, value]) => ({
        code,
        value
    }));
    const dirty = changes.length > 0;
    useEffect(() => {
        const warn = (e: BeforeUnloadEvent) => {
            if (dirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);
    const mutation = useMutation({
        mutationFn: async () => {
            const result = await saveChanges(changes, ({
                                                           code,
                                                           value
                                                       }) => target ? (value === null ? adminService.clearUserPermission(target.id, code) : adminService.setUserPermission(target.id, code, value)) : adminService.setRolePermission(template!.role, code, value === true), t);
            return result;
        }
    });
    const reload = useMutation({
        mutationFn: () => invalidate(target?.id, !target), onSuccess: () => {
            setDraft({});
            mutation.reset();
        }
    });
    const save = async () => {
        if (!window.confirm(target ? t('admin.access.saveConfirmUser', {count: changes.length, name: target.username}) : t('admin.access.saveConfirmTemplate', {count: changes.length, name: template?.name ?? ''}))) return;
        await mutation.mutateAsync();
        setDraft({});
        await invalidate(target?.id, !target);
        // The result stays visible while the server-backed queries refresh.
    };
    const result = mutation.data;
    const modules = [...new Set(permissions.map(p => p.code.split('_')[0]))].sort();
    return <section className="space-y-4"><h2
        className="text-lg font-semibold">{target ? t('admin.access.effectiveMatrix') : t('admin.access.rolePermissions')}</h2><p
        className="text-sm text-slate-600">{t('admin.access.overrideHint')}</p>
        {target?.status !== 'ACTIVE' && target &&
            <Alert variant="warning">{t('admin.access.inactiveWarning', {status: displayLabel(target.status).toLowerCase()})}</Alert>}
        {result && <Alert variant={result.failed.length ? 'warning' : 'success'}><p>{t('admin.access.saved', {codes: result.succeeded.join(', ') || t('admin.access.none')})}</p>{result.failed.length > 0 &&
            <ul>{result.failed.map(f => <li key={f.code}>{t('admin.access.failedItem', {code: f.code, message: f.message})}</li>)}</ul>}<p>{t('admin.access.noUndo')}</p><Button size="sm" variant="outline"
                                                                                      disabled={reload.isPending}
                                                                                      isLoading={reload.isPending}
                                                                                      onClick={() => reload.mutate()}>{t('admin.access.reloadActual')}</Button></Alert>}
        {reload.error && <Alert variant="error">{t('admin.access.reloadFailed')}</Alert>}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm"><label className="flex min-h-[44px] min-w-[160px] max-w-[320px] flex-1 items-center gap-2 rounded-[10px] border border-border-input bg-card px-2.5 text-muted focus-within:outline-2 focus-within:outline-primary"><span
            className="sr-only">{t('admin.access.filterLabel')}</span><input className="min-h-[42px] w-full min-w-0 bg-transparent text-sm text-foreground outline-none" placeholder={t('admin.access.filterPlaceholder')} value={filter}
                                                       onChange={e => setFilter(e.target.value)}/></label><span
            role="status">{t('admin.access.unsavedCount', {count: changes.length})}</span><Button
            disabled={!dirty || mutation.isPending || !!result} isLoading={mutation.isPending}
            onClick={() => void save()}>{t('admin.access.reviewAndSave')}</Button><Button variant="outline"
                                                                       disabled={!dirty || mutation.isPending}
                                                                       onClick={() => setDraft({})}>{t('admin.access.discardChanges')}</Button></div>
        {dirty && <details className="rounded border bg-white p-3" open>
            <summary>{t('admin.access.reviewChanges')}</summary>
            <ul className="mt-2">{changes.map(c => <li
                key={c.code}>{c.code}: {c.value === null ? t('admin.access.fromRole') : c.value ? t('admin.access.allow') : t('admin.access.deny')}</li>)}</ul>
        </details>}
        {modules.map(module => {
            const rows = permissions.filter(p => p.code.startsWith(module + '_') && (p.code + ' ' + permissionLabel(p.code, p.description)).toLowerCase().includes(filter.toLowerCase()));
            return rows.length > 0 && <section key={module} className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm"><h3
                className="flex min-h-[52px] items-center justify-between border-b border-border px-[18px] py-3.5 text-[15px] font-semibold text-foreground">{displayLabel(module)}</h3>
                <div className="max-h-[640px] overflow-auto" tabIndex={0} aria-label={t('admin.access.moduleTable', {module})}>
                    <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                        <thead>
                        <tr>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.access.col.permission')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.access.col.fromRole')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{dirty ? t('admin.access.col.expected') : t('admin.access.col.effective')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.access.col.source')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{target ? t('admin.access.col.override') : t('admin.access.col.grant')}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">{rows.map(p => {
                            const value = p.code in draft ? draft[p.code] : (values[p.code] ?? (target ? null : false));
                            const effective = permissionState(p.code, template?.permissions, target ? value : undefined, !target || target.status === 'ACTIVE', t);
                            const allowed = target ? effective.allowed : value;
                            return <tr key={p.code} className="transition-colors hover:bg-background">
                                <td className="px-4 py-3.5 align-middle text-foreground"><strong className="font-semibold text-foreground">{p.code}</strong><span
                                    className="mt-0.5 block text-xs text-muted">{permissionLabel(p.code, p.description)}</span></td>
                                <td className="px-4 py-3.5 align-middle text-foreground">{template ? (template.permissions.includes(p.code) ? t('admin.access.allow') : t('admin.access.deny')) : t('admin.access.undetermined')}</td>
                                <td className="px-4 py-3.5 align-middle text-foreground">{allowed === null ? t('admin.access.undetermined') : allowed ? t('admin.access.allow') : t('admin.access.deny')}</td>
                                <td className="px-4 py-3.5 align-middle text-foreground">{target ? effective.source : t('admin.access.source.template')}</td>
                                <td className="px-4 py-3.5 align-middle text-foreground"><select aria-label={target ? t('admin.access.selectOverride', {code: p.code}) : t('admin.access.selectTemplate', {code: p.code})}
                                            className="min-h-[44px] rounded-[10px] border border-border-input bg-card px-3 py-2 text-sm text-foreground disabled:opacity-55" disabled={mutation.isPending || !!result}
                                            value={value === null ? 'inherit' : String(value)}
                                            onChange={e => setDraft(d => ({
                                                ...d,
                                                [p.code]: e.target.value === 'inherit' ? null : e.target.value === 'true'
                                            }))}>{target && <option value="inherit">{t('admin.access.fromRole')}</option>}
                                    <option value="true">{t('admin.access.allow')}</option>
                                    <option value="false">{t('admin.access.deny')}</option>
                                </select></td>
                            </tr>;
                        })}</tbody>
                    </table>
                </div>
            </section>;
        })}
        <Link className="text-primary underline" href="/admin/audit-logs">{t('admin.access.auditLink')}</Link></section>;
}
