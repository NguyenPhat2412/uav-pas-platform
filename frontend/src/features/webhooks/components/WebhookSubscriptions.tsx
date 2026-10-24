'use client';

import {useState, type FormEvent} from 'react';
import {useMutation} from '@tanstack/react-query';
import {KeyRound, Plus, Trash2, X} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {RequiredMark} from '@/components/shared/RequiredMark';
import {Switch} from '@/components/ui/Switch';
import {adminService} from '@/lib/api/admin';
import {cn} from '@/lib/utils';
import type {WebhookEndpointItem} from '@/types/admin';

/** Event types the backend actually dispatches; a subscription matches when its list contains the type. */
const webhookEvents = ['SAR_EMERGENCY_TRIGGERED', 'GEOFENCE_BREACH', 'BATTERY_CRITICAL_RTH', 'SAR_RTH_REQUESTED', 'INVOICE_ISSUED', 'PAYMENT_COMPLETED', 'WEBHOOK_TEST'];

function newSecret() {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function WebhookSubscriptions({items, onChanged}: { items: WebhookEndpointItem[]; onChanged: () => void }) {
    const {t} = useI18n();
    const [creating, setCreating] = useState(false);
    const toggle = useMutation({
        mutationFn: ({id, active}: { id: number; active: boolean }) => adminService.toggleWebhook(id, active),
        onSuccess: onChanged,
    });
    const remove = useMutation({mutationFn: adminService.deleteWebhook, onSuccess: onChanged});
    const busy = toggle.isPending || remove.isPending;

    return <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">{t('admin.webhooks.subscriptions')}</h3>
            <button type="button" onClick={() => setCreating(true)}
                    className="inline-flex h-9 items-center gap-1.5 bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:opacity-90">
                <Plus size={15} aria-hidden="true"/>{t('admin.webhooks.crud.add')}
            </button>
        </div>
        <ErrorNotice error={toggle.error || remove.error}/>
        {items.length === 0 ? <p className="border border-dashed border-slate-300 px-4 py-8 text-center text-[13px] text-slate-500">
            {t('admin.webhooks.noSubscriptions')}</p> :
            <div className="overflow-x-auto border border-slate-200 bg-white">
                <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                    <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                        <th className="px-4 py-3">{t('admin.webhooks.crud.colName')}</th>
                        <th className="px-4 py-3">{t('admin.webhooks.crud.colEvents')}</th>
                        <th className="w-32 px-4 py-3">{t('admin.webhooks.crud.colActive')}</th>
                        <th className="w-24 px-4 py-3 text-right">{t('admin.webhooks.col.actions')}</th>
                    </tr>
                    </thead>
                    <tbody>{items.map(item => <tr key={item.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-3">
                            <strong className="block text-slate-900">{item.name}</strong>
                            <span className="block break-all font-mono text-xs text-slate-500">{item.targetUrl}</span>
                        </td>
                        <td className="px-4 py-3"><div className="flex flex-wrap gap-1">
                            {item.eventsSubscribed.split(',').map(e => e.trim()).filter(Boolean).map(e =>
                                <span key={e} className="bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">{e}</span>)}
                        </div></td>
                        <td className="px-4 py-3">
                            <Switch
                                checked={item.isActive}
                                disabled={busy}
                                aria-label={t('admin.webhooks.crud.toggleLabel', {name: item.name})}
                                label={item.isActive ? t('admin.webhooks.subscriptionOn') : t('admin.webhooks.subscriptionOff')}
                                onCheckedChange={(nextActive) => toggle.mutate({id: item.id, active: nextActive})}
                            />
                        </td>
                        <td className="px-4 py-3 text-right">
                            <button type="button" disabled={busy} aria-label={t('admin.webhooks.crud.delete', {name: item.name})}
                                    onClick={() => {
                                        if (window.confirm(t('admin.webhooks.crud.deleteConfirm', {name: item.name}))) remove.mutate(item.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 size={16}/></button>
                        </td>
                    </tr>)}</tbody>
                </table>
            </div>}
        {creating && <CreateDialog onClose={() => setCreating(false)} onCreated={() => {
            setCreating(false);
            onChanged();
        }}/>}
    </section>;
}

function CreateDialog({onClose, onCreated}: { onClose: () => void; onCreated: () => void }) {
    const {t} = useI18n();
    const [name, setName] = useState('');
    const [url, setUrl] = useState('https://');
    const [secret, setSecret] = useState(newSecret);
    const [events, setEvents] = useState<string[]>(['SAR_EMERGENCY_TRIGGERED']);
    const create = useMutation({mutationFn: adminService.createWebhook});
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await create.mutateAsync({name: name.trim(), targetUrl: url.trim(), secretKey: secret.trim(), eventsSubscribed: events.join(',')});
            onCreated();
        } catch {/* Shown below. */
        }
    };
    const field = 'mt-1 w-full border border-slate-200 px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none';
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
                onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <form role="dialog" aria-modal="true" aria-labelledby="create-webhook-title" onSubmit={e => void submit(e)}
              onKeyDown={e => e.key === 'Escape' && onClose()}
              className="flex max-h-[calc(100dvh-32px)] w-full max-w-lg flex-col gap-4 overflow-y-auto bg-white p-6 shadow-2xl">
            <header className="flex items-center justify-between">
                <h2 id="create-webhook-title" className="text-lg font-bold">{t('admin.webhooks.crud.title')}</h2>
                <button type="button" onClick={onClose} aria-label={t('admin.webhooks.crud.cancel')} className="p-1 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
            </header>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.webhooks.crud.name')}<RequiredMark/>
                <input required autoFocus maxLength={150} value={name} onChange={e => setName(e.target.value)} className={field}/></label>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.webhooks.crud.url')}<RequiredMark/>
                <input required type="url" pattern="https://.+" maxLength={500} value={url} onChange={e => setUrl(e.target.value)} className={cn(field, 'font-mono')}/>
                <span className="mt-1 block text-xs font-normal text-slate-500">{t('admin.webhooks.crud.urlHint')}</span></label>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.webhooks.crud.secret')}<RequiredMark/>
                <span className="mt-1 flex gap-2">
                    <input required minLength={16} maxLength={120} value={secret} onChange={e => setSecret(e.target.value)} className={cn(field, 'mt-0 font-mono')}/>
                    <button type="button" onClick={() => setSecret(newSecret())} title={t('admin.webhooks.crud.regenerate')}
                            className="inline-flex items-center gap-1 border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">
                        <KeyRound size={14} aria-hidden="true"/>{t('admin.webhooks.crud.regenerate')}</button>
                </span>
                <span className="mt-1 block text-xs font-normal text-slate-500">{t('admin.webhooks.crud.secretHint')}</span></label>
            <fieldset className="text-[13px]">
                <legend className="font-semibold text-slate-600">{t('admin.webhooks.crud.events')}<RequiredMark/></legend>
                <div className="mt-1 grid gap-1.5 sm:grid-cols-2">{webhookEvents.map(event => <label key={event} className="flex items-center gap-2">
                    <input type="checkbox" checked={events.includes(event)}
                           onChange={e => setEvents(list => e.target.checked ? [...list, event] : list.filter(x => x !== event))}/>
                    <span className="font-mono text-xs">{event}</span>
                </label>)}</div>
            </fieldset>
            <ErrorNotice error={create.error}/>
            <footer className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="h-9 border border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                    {t('admin.webhooks.crud.cancel')}</button>
                <button type="submit" disabled={create.isPending || !events.length}
                        className="h-9 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">{t('admin.webhooks.crud.submit')}</button>
            </footer>
        </form>
    </div>;
}
