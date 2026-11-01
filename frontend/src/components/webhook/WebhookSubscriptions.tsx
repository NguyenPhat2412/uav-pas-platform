'use client';

import {useState, type FormEvent} from 'react';
import {Copy, KeyRound, Plus, RefreshCcwDot, Trash2, X} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {RequiredMark} from '@/components/shared/RequiredMark';
import {Switch} from '@/components/ui/Switch';
import {cn} from '@/lib/utils';
import type {WebhookEndpointItem} from '@/types/admin';
import {useCreateWebhook, useWebhookSubscriptionMutations} from '@/hooks/webhook/useWebhooks';
import {
    canSubmitWebhookSubscription,
    createWebhookSubscriptionDraft,
    generateWebhookSecret,
    toWebhookSubscriptionPayload,
    WEBHOOK_EVENTS,
    webhookFieldErrors,
} from '@/forms/webhook/webhook-form';
import {WebhookSecretDialog} from '@/components/webhook/WebhookSecretDialog';

export function WebhookSubscriptions({items, onChanged}: { items: WebhookEndpointItem[]; onChanged: () => void }) {
    const {t} = useI18n();
    const [creating, setCreating] = useState(false);
    // The rotated secret is held only in component state until the reveal dialog closes.
    const [revealed, setRevealed] = useState<{ name: string; secret: string } | null>(null);
    const {toggle, remove, rotate} = useWebhookSubscriptionMutations({
        onChanged,
        onRotated: (result, item) => setRevealed({name: item.name, secret: result.secretKey}),
    });
    const busy = toggle.isPending || remove.isPending || rotate.isPending;

    return <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">{t('admin.webhooks.subscriptions')}</h3>
            <button type="button" onClick={() => setCreating(true)}
                    className="inline-flex h-9 items-center gap-1.5 bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:opacity-90">
                <Plus size={15} aria-hidden="true"/>{t('admin.webhooks.crud.add')}
            </button>
        </div>
        <ErrorNotice error={toggle.error || remove.error || rotate.error}/>
        {items.length === 0 ? <p className="border border-dashed border-slate-300 px-4 py-8 text-center text-[13px] text-slate-500">
            {t('admin.webhooks.noSubscriptions')}</p> :
            <div className="overflow-x-auto border border-slate-200 bg-white">
                <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                    <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                        <th className="px-4 py-3">{t('admin.webhooks.crud.colName')}</th>
                        <th className="px-4 py-3">{t('admin.webhooks.crud.colEvents')}</th>
                        <th className="w-32 px-4 py-3">{t('admin.webhooks.crud.colActive')}</th>
                        <th className="w-28 px-4 py-3 text-right">{t('admin.webhooks.col.actions')}</th>
                    </tr>
                    </thead>
                    <tbody>{items.map(item => <tr key={item.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-3">
                            <strong className="block text-slate-900">{item.name}</strong>
                            <span className="block break-all font-mono text-xs text-slate-500">{item.targetUrl}</span>
                            <span className="mt-0.5 block font-mono text-[11px] text-slate-400" title={t('adminCommerce.webhooks.maskedSecret')}>{item.secretKey}</span>
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
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                            <button type="button" disabled={busy} aria-label={t('adminCommerce.webhooks.rotate', {name: item.name})}
                                    title={t('adminCommerce.webhooks.rotate', {name: item.name})}
                                    onClick={() => {
                                        if (window.confirm(t('adminCommerce.webhooks.rotateConfirm', {name: item.name}))) rotate.mutate(item);
                                    }}
                                    className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"><RefreshCcwDot size={16}/></button>
                            <button type="button" disabled={busy} aria-label={t('admin.webhooks.crud.delete', {name: item.name})}
                                    onClick={() => {
                                        if (window.confirm(t('admin.webhooks.crud.deleteConfirm', {name: item.name}))) remove.mutate(item.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 size={16}/></button>
                        </td>
                    </tr>)}</tbody>
                </table>
            </div>}
        {revealed && <WebhookSecretDialog name={revealed.name} secret={revealed.secret} onClose={() => setRevealed(null)}/>}
        {creating && <CreateDialog onClose={() => setCreating(false)} onCreated={() => {
            setCreating(false);
            onChanged();
        }}/>}
    </section>;
}

function CreateDialog({onClose, onCreated}: { onClose: () => void; onCreated: () => void }) {
    const {t} = useI18n();
    const [draft, setDraft] = useState(createWebhookSubscriptionDraft);
    const create = useCreateWebhook();
    const fieldErrors = webhookFieldErrors(create.error);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await create.mutateAsync(toWebhookSubscriptionPayload(draft));
            onCreated();
        } catch {/* Shown below. */
        }
    };
    const field = 'mt-1 w-full border border-slate-200 px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none aria-[invalid=true]:border-danger';
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
                onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <form noValidate role="dialog" aria-modal="true" aria-labelledby="create-webhook-title" onSubmit={e => void submit(e)}
              onKeyDown={e => e.key === 'Escape' && onClose()}
              className="flex max-h-[calc(100dvh-32px)] w-full max-w-lg flex-col gap-4 overflow-y-auto bg-white p-6 shadow-2xl">
            <header className="flex items-center justify-between">
                <h2 id="create-webhook-title" className="text-lg font-bold">{t('admin.webhooks.crud.title')}</h2>
                <button type="button" onClick={onClose} aria-label={t('admin.webhooks.crud.cancel')} className="p-1 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
            </header>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.webhooks.crud.name')}<RequiredMark/>
                <input aria-required aria-invalid={Boolean(fieldErrors?.name)} autoFocus value={draft.name} onChange={e => setDraft(prev => ({...prev, name: e.target.value}))} className={field}/>
                {fieldErrors?.name && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.name}</span>}</label>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.webhooks.crud.url')}<RequiredMark/>
                <input aria-required aria-invalid={Boolean(fieldErrors?.targetUrl)} type="url" value={draft.targetUrl} onChange={e => setDraft(prev => ({...prev, targetUrl: e.target.value}))} className={cn(field, 'font-mono')}/>
                {fieldErrors?.targetUrl ? <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.targetUrl}</span> :
                    <span className="mt-1 block text-xs font-normal text-slate-500">{t('admin.webhooks.crud.urlHint')}</span>}</label>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.webhooks.crud.secret')}<RequiredMark/>
                <span className="mt-1 flex gap-2">
                    <input aria-required aria-invalid={Boolean(fieldErrors?.secretKey)} value={draft.secretKey} onChange={e => setDraft(prev => ({...prev, secretKey: e.target.value}))} className={cn(field, 'mt-0 font-mono')}/>
                    <button type="button" onClick={() => setDraft(prev => ({...prev, secretKey: generateWebhookSecret()}))} title={t('admin.webhooks.crud.regenerate')}
                            className="inline-flex items-center gap-1 border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">
                        <KeyRound size={14} aria-hidden="true"/>{t('admin.webhooks.crud.regenerate')}</button>
                    <button type="button" onClick={() => void navigator.clipboard?.writeText(draft.secretKey).catch(() => undefined)}
                            title={t('adminCommerce.webhooks.secret.copy')} aria-label={t('adminCommerce.webhooks.secret.copy')}
                            className="inline-flex items-center border border-slate-200 px-2.5 text-slate-600 hover:bg-slate-50">
                        <Copy size={14} aria-hidden="true"/></button>
                </span>
                {fieldErrors?.secretKey && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.secretKey}</span>}
                <span className="mt-1 block text-xs font-normal text-amber-700">{t('adminCommerce.webhooks.createSecretHint')}</span>
                <span className="mt-1 block text-xs font-normal text-slate-500">{t('admin.webhooks.crud.secretHint')}</span></label>
            <fieldset className="text-[13px]">
                <legend className="font-semibold text-slate-600">{t('admin.webhooks.crud.events')}<RequiredMark/></legend>
                <div className="mt-1 grid gap-1.5 sm:grid-cols-2">{WEBHOOK_EVENTS.map(event => <label key={event} className="flex items-center gap-2">
                    <input type="checkbox" checked={draft.events.includes(event)}
                           onChange={e => setDraft(prev => ({
                               ...prev,
                               events: e.target.checked ? [...prev.events, event] : prev.events.filter(x => x !== event),
                           }))}/>
                    <span className="font-mono text-xs">{event}</span>
                </label>)}</div>
                {fieldErrors?.eventsSubscribed && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.eventsSubscribed}</span>}
            </fieldset>
            {create.error && !fieldErrors && <ErrorNotice error={create.error}/>}
            <footer className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="h-9 border border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                    {t('admin.webhooks.crud.cancel')}</button>
                <button type="submit" disabled={create.isPending || !canSubmitWebhookSubscription(draft)}
                        className="h-9 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">{t('admin.webhooks.crud.submit')}</button>
            </footer>
        </form>
    </div>;
}
