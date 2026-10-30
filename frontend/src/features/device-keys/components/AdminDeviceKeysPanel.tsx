'use client';

import React, {useEffect, useId, useRef, useState} from 'react';
import {Check, Copy, KeyRound, Plus, ShieldOff, TriangleAlert} from 'lucide-react';
import {AdminPage} from '@/components/layout/AdminPage';
import {QueryState} from '@/components/data/WorkspaceState';
import {Button} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {ApiError} from '@/lib/api';
import {cn} from '@/lib/utils';
import type {CreatedDeviceKey, DeviceKey} from '@/features/device-keys/api/device-keys.api';
import {useCreateDeviceKey, useDeviceKeys, useDeviceKeyUavOptions, useRevokeDeviceKey} from '@/features/device-keys/hooks/useDeviceKeys';

interface UavOption {
    id: number;
    serialNumber: string;
    model: string;
}

const statusTone: Record<DeviceKey['status'], string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    EXPIRED: 'bg-amber-50 text-amber-700 border-amber-200',
    REVOKED: 'bg-slate-100 text-slate-500 border-slate-200',
};

function Modal({title, onClose, children}: { title: string; onClose: () => void; children: React.ReactNode }) {
    const ref = useRef<HTMLDialogElement>(null);
    const labelId = useId();
    useEffect(() => {
        const dialog = ref.current;
        const previous = document.activeElement as HTMLElement | null;
        dialog?.showModal();
        return () => {
            dialog?.close();
            previous?.focus();
        };
    }, []);
    return <dialog ref={ref} aria-labelledby={labelId}
                   onCancel={event => {
                       event.preventDefault();
                       onClose();
                   }}
                   className="m-auto w-[min(520px,calc(100vw-32px))] rounded-overlay border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-slate-900/40">
        <header className="border-b border-border px-5 py-4">
            <h2 id={labelId} className="m-0 text-base font-bold text-slate-900">{title}</h2>
        </header>
        <div className="space-y-4 px-5 py-4">{children}</div>
    </dialog>;
}

function AdminDeviceKeysContent() {
    const {t, formatDate} = useI18n();
    const {query, refresh} = useDeviceKeys();
    const uavQuery = useDeviceKeyUavOptions();
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState<CreatedDeviceKey | null>(null);
    const [revoking, setRevoking] = useState<DeviceKey | null>(null);
    const [showRevoked, setShowRevoked] = useState(false);

    const revoke = useRevokeDeviceKey({onSuccess: () => setRevoking(null)});

    const date = (value: string | null) => value ? formatDate(value, {dateStyle: 'medium', timeStyle: 'short'}) : '—';
    const keys = (query.data ?? []).filter(k => showRevoked || k.status !== 'REVOKED');

    return <div className="space-y-5 pb-12">
        <div className="flex flex-col gap-3 rounded-panel border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="m-0 text-sm text-slate-700">{t('adminPlatform.deviceKeys.intro')}</p>
                <p className="m-0 mt-1 font-mono text-xs text-slate-500">POST /api/v1/uavs/{'{id}'}/telemetry · X-Device-Key: uavk_…</p>
            </div>
            <Button onClick={() => setCreating(true)} leftIcon={<Plus size={16}/>}>{t('adminPlatform.deviceKeys.create')}</Button>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={showRevoked} onChange={e => setShowRevoked(e.target.checked)}/>
            {t('adminPlatform.deviceKeys.showRevoked')}
        </label>

        <QueryState query={query}>
            {keys.length === 0
                ? <div className="rounded-panel border border-dashed border-border bg-card p-8 text-center text-sm text-slate-500">
                    <KeyRound className="mx-auto mb-2 text-slate-400" size={22} aria-hidden="true"/>{t('adminPlatform.deviceKeys.empty')}
                </div>
                : <div className="overflow-x-auto rounded-panel border border-border bg-card">
                    <table className="w-full min-w-[760px] text-left text-[13px]">
                        <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                            <th scope="col" className="px-4 py-3">{t('adminPlatform.deviceKeys.columns.name')}</th>
                            <th scope="col" className="px-4 py-3">{t('adminPlatform.deviceKeys.columns.key')}</th>
                            <th scope="col" className="px-4 py-3">{t('adminPlatform.deviceKeys.columns.uav')}</th>
                            <th scope="col" className="px-4 py-3">{t('adminPlatform.deviceKeys.columns.status')}</th>
                            <th scope="col" className="px-4 py-3">{t('adminPlatform.deviceKeys.columns.lastUsed')}</th>
                            <th scope="col" className="px-4 py-3">{t('adminPlatform.deviceKeys.columns.expires')}</th>
                            <th scope="col" className="px-4 py-3"><span className="sr-only">{t('adminPlatform.deviceKeys.columns.actions')}</span></th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {keys.map(k => <tr key={k.id} className={cn(k.status === 'REVOKED' && 'text-slate-400')}>
                            <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900">{k.name}</div>
                                <div className="text-xs text-slate-500">{t('adminPlatform.deviceKeys.createdBy', {user: k.createdBy, date: date(k.createdAt)})}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{k.keyPrefix}…</td>
                            <td className="px-4 py-3">{k.uavId ? (k.uavSerialNumber ?? `#${k.uavId}`) : <span className="text-amber-700">{t('adminPlatform.deviceKeys.anyUav')}</span>}</td>
                            <td className="px-4 py-3">
                                <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', statusTone[k.status])}>
                                    {t(`adminPlatform.deviceKeys.status.${k.status}`)}
                                </span>
                            </td>
                            <td className="px-4 py-3 tabular-nums">{k.lastUsedAt ? date(k.lastUsedAt) : t('adminPlatform.deviceKeys.never')}</td>
                            <td className="px-4 py-3 tabular-nums">{k.expiresAt ? date(k.expiresAt) : t('adminPlatform.deviceKeys.noExpiry')}</td>
                            <td className="px-4 py-3 text-right">
                                {k.status !== 'REVOKED' && <Button size="sm" variant="outline" onClick={() => setRevoking(k)}
                                                                   leftIcon={<ShieldOff size={14}/>}>{t('adminPlatform.deviceKeys.revoke')}</Button>}
                            </td>
                        </tr>)}
                        </tbody>
                    </table>
                </div>}
        </QueryState>

        {creating && <CreateKeyDialog uavs={uavQuery.data?.content ?? []}
                                      onClose={() => setCreating(false)}
                                      onCreated={result => {
                                          setCreating(false);
                                          setCreated(result);
                                          void refresh();
                                      }}/>}
        {created && <ShowKeyDialog created={created} onClose={() => setCreated(null)}/>}
        {revoking && <Modal title={t('adminPlatform.deviceKeys.revokeTitle')} onClose={() => setRevoking(null)}>
            <p className="m-0 text-sm text-slate-700">{t('adminPlatform.deviceKeys.revokeConfirm', {name: revoking.name, prefix: revoking.keyPrefix})}</p>
            {revoke.error && <p role="alert" className="m-0 text-sm text-red-700">{revoke.error.message}</p>}
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRevoking(null)}>{t('adminPlatform.common.cancel')}</Button>
                <Button variant="danger" isLoading={revoke.isPending} onClick={() => revoke.mutate(revoking.id)}>{t('adminPlatform.deviceKeys.revoke')}</Button>
            </div>
        </Modal>}
    </div>;
}

function CreateKeyDialog({uavs, onClose, onCreated}: {
    uavs: UavOption[];
    onClose: () => void;
    onCreated: (created: CreatedDeviceKey) => void
}) {
    const {t} = useI18n();
    const [name, setName] = useState('');
    const [uavId, setUavId] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const create = useCreateDeviceKey({onSuccess: onCreated});
    const fieldError = (field: string) => create.error instanceof ApiError ? create.error.fields?.[field] : undefined;
    const input = 'min-h-[40px] w-full rounded-control border border-border-input bg-slate-50 px-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none';
    return <Modal title={t('adminPlatform.deviceKeys.createTitle')} onClose={onClose}>
        <form className="space-y-4" onSubmit={event => {
            event.preventDefault();
            if (name.trim()) create.mutate({
                name: name.trim(),
                uavId: uavId ? Number(uavId) : null,
                expiresAt: expiresAt ? `${expiresAt}:00` : null,
            });
        }}>
            <label className="block space-y-1 text-sm font-semibold text-slate-800">
                <span>{t('adminPlatform.deviceKeys.form.name')}</span>
                <input className={input} value={name} maxLength={120} required autoFocus onChange={e => setName(e.target.value)}
                       placeholder={t('adminPlatform.deviceKeys.form.namePlaceholder')}/>
                {fieldError('name') && <span className="block text-xs text-red-700">{fieldError('name')}</span>}
            </label>
            <label className="block space-y-1 text-sm font-semibold text-slate-800">
                <span>{t('adminPlatform.deviceKeys.form.uav')}</span>
                <select className={input} value={uavId} onChange={e => setUavId(e.target.value)}>
                    <option value="">{t('adminPlatform.deviceKeys.anyUav')}</option>
                    {uavs.map(u => <option key={u.id} value={u.id}>{u.serialNumber} · {u.model}</option>)}
                </select>
                <span className="block text-xs font-normal text-slate-500">{t('adminPlatform.deviceKeys.form.uavHint')}</span>
            </label>
            <label className="block space-y-1 text-sm font-semibold text-slate-800">
                <span>{t('adminPlatform.deviceKeys.form.expiresAt')}</span>
                <input type="datetime-local" className={input} value={expiresAt} onChange={e => setExpiresAt(e.target.value)}/>
                <span className="block text-xs font-normal text-slate-500">{t('adminPlatform.deviceKeys.form.expiresHint')}</span>
                {fieldError('expiresAt') && <span className="block text-xs text-red-700">{fieldError('expiresAt')}</span>}
            </label>
            {create.error && !fieldError('name') && !fieldError('expiresAt') &&
                <p role="alert" className="m-0 text-sm text-red-700">{create.error.message}</p>}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>{t('adminPlatform.common.cancel')}</Button>
                <Button type="submit" isLoading={create.isPending} disabled={!name.trim()}>{t('adminPlatform.deviceKeys.create')}</Button>
            </div>
        </form>
    </Modal>;
}

function ShowKeyDialog({created, onClose}: { created: CreatedDeviceKey; onClose: () => void }) {
    const {t} = useI18n();
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(created.secret);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };
    return <Modal title={t('adminPlatform.deviceKeys.createdTitle')} onClose={onClose}>
        <p className="m-0 flex items-start gap-2 rounded-panel border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true"/>{t('adminPlatform.deviceKeys.onceWarning')}
        </p>
        <div className="flex items-stretch gap-2">
            <input readOnly value={created.secret} aria-label={t('adminPlatform.deviceKeys.secretLabel')}
                   onFocus={e => e.currentTarget.select()}
                   className="min-h-[40px] min-w-0 flex-1 rounded-control border border-border-input bg-slate-50 px-2.5 font-mono text-xs text-slate-900"/>
            <Button variant="outline" onClick={() => void copy()} leftIcon={copied ? <Check size={14}/> : <Copy size={14}/>}>
                {copied ? t('adminPlatform.deviceKeys.copied') : t('adminPlatform.deviceKeys.copy')}
            </Button>
        </div>
        <p className="m-0 text-xs text-slate-500">{t('adminPlatform.deviceKeys.usage')}</p>
        <div className="flex justify-end">
            <Button onClick={onClose}>{t('adminPlatform.deviceKeys.done')}</Button>
        </div>
    </Modal>;
}

export default function AdminDeviceKeysPage() {
    return <AdminPage title="adminPlatform.deviceKeys.title" permission="PERMISSION_MANAGE" activeResource="device-keys">
        <AdminDeviceKeysContent/>
    </AdminPage>;
}
