'use client';

import {useRef, useState, type FormEvent} from 'react';
import {Pencil, Plus, Search, X} from 'lucide-react';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {confirmDialog} from '@/providers/ConfirmContext';
import {useI18n} from '@/providers/I18nContext';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import {FilterSelect} from '@/components/shared/FilterSelect';
import {Switch} from '@/components/ui/Switch';
import {cn} from '@/lib/utils';
import {useAdminServiceOfferings, useSaveServiceOffering, useToggleServiceOffering} from '@/hooks/catalog/useServiceOfferings';
import {
    canSubmitServiceOffering,
    createServiceOfferingDraft,
    serviceOfferingFieldErrors,
    toServiceOfferingPayload,
    type ServiceOfferingSpecDraft,
} from '@/forms/catalog/service-offering-form';
import {serviceSensors, type ServiceOffering} from '@/types/catalog/service-offering.types';
import {toast} from '@/providers/ToastContext';

export function AdminServicesPanel() {
    const {t} = useI18n();
    const [search, setSearch] = useState('');
    const [show, setShow] = useState<'all' | 'active' | 'inactive'>('all');
    const [editing, setEditing] = useState<ServiceOffering | 'new' | null>(null);
    const {query, refresh} = useAdminServiceOfferings();
    const toggle = useToggleServiceOffering();
    const term = search.trim().toLowerCase();
    const rows = (query.data ?? []).filter(s => (show === 'all' || (show === 'active') === s.active)
        && (!term || `${s.code} ${s.name} ${s.description ?? ''}`.toLowerCase().includes(term)));
    const activeCount = (query.data ?? []).filter(s => s.active).length;

    return <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
            <FilterSelect label={t('admin.services.col.status')} value={show} onChange={setShow}
                          options={(['all', 'active', 'inactive'] as const).map(value => ({value, label: t(`admin.services.filter.${value}`)}))}/>
            <label className="relative">
                <span className="sr-only">{t('admin.services.search')}</span>
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true"/>
                <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.services.search')}
                       className="h-9 w-60 border border-slate-200 bg-white pl-9 pr-3 text-[13px] focus:border-primary focus:outline-none"/>
            </label>
            <span className="text-xs text-slate-500">{t('admin.services.summary', {active: activeCount, total: query.data?.length ?? 0})}</span>
            <button type="button" onClick={() => setEditing('new')}
                    className="ml-auto inline-flex h-9 items-center gap-1.5 bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:opacity-90">
                <Plus size={15} aria-hidden="true"/>{t('admin.services.add')}</button>
        </div>
        <ErrorNotice error={toggle.error}/>
        <section className="border border-slate-200 bg-white">
            <QueryState query={query}>{rows.length ? <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.services.table')}>
                <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                    <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                        <th className="px-4 py-3">{t('admin.services.col.service')}</th>
                        <th className="px-4 py-3">{t('admin.services.col.description')}</th>
                        <th className="w-36 px-4 py-3">{t('admin.services.col.duration')}</th>
                        <th className="w-36 px-4 py-3">{t('admin.services.col.status')}</th>
                        <th className="w-20 px-4 py-3 text-right">{t('admin.services.col.actions')}</th>
                    </tr>
                    </thead>
                    <tbody>{rows.map(s => <tr key={s.id} className={cn('border-t border-slate-100 align-top', !s.active && 'bg-slate-50/60 text-slate-500')}>
                        <td className="px-4 py-3"><strong className="block text-slate-900">{s.name}</strong>
                            <span className="font-mono text-[11.5px] text-slate-500">{s.code}</span></td>
                        <td className="px-4 py-3 text-slate-600">{s.description || '—'}</td>
                        <td className="px-4 py-3 tabular-nums">{t('admin.services.minutes', {count: s.defaultDurationMinutes})}</td>
                        <td className="px-4 py-3">
                            <Switch
                                checked={s.active}
                                disabled={toggle.isPending}
                                aria-label={t('admin.services.toggleLabel', {name: s.name})}
                                label={t(s.active ? 'admin.services.active' : 'admin.services.inactive')}
                                onCheckedChange={(nextActive) => void (async () => {
                                    if (!nextActive && !(await confirmDialog(t('admin.services.deactivateConfirm', {name: s.name})))) return;
                                    toggle.mutate({id: s.id, active: nextActive});
                                })()}
                            />
                        </td>
                        <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => setEditing(s)} aria-label={t('admin.services.edit', {name: s.name})}
                                    className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Pencil size={15}/></button>
                        </td>
                    </tr>)}</tbody>
                </table>
            </div> : <p className="px-6 py-12 text-center text-[13px] text-slate-500">{t('admin.services.empty')}</p>}</QueryState>
        </section>
        <p className="text-xs text-slate-500">{t('admin.services.note')}</p>
        {editing && <ServiceDialog service={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => {
            setEditing(null);
            void refresh();
        }}/>}
    </div>;
}

function ServiceDialog({service, onClose, onSaved}: { service: ServiceOffering | null; onClose: () => void; onSaved: () => void }) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLFormElement>(null);
    useDialogFocusTrap(dialogRef, true, onClose);
    const [draft, setDraft] = useState(() => createServiceOfferingDraft(service));
    const save = useSaveServiceOffering();
    const fieldErrors = serviceOfferingFieldErrors(save.error);
    const field = 'mt-1 w-full border border-slate-200 px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none aria-[invalid=true]:border-danger';
    const specField = (key: keyof ServiceOfferingSpecDraft, label: string, step: number) =>
        <label className="text-[13px] font-semibold text-slate-600">{label}
            <input type="number" step={step} aria-invalid={Boolean(fieldErrors?.[key])} value={draft.spec[key]} placeholder={t('admin.services.spec.notCommitted')}
                   onChange={e => setDraft(prev => ({...prev, spec: {...prev.spec, [key]: e.target.value}}))} className={cn(field, 'tabular-nums')}/>
            {fieldErrors?.[key] && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors[key]}</span>}</label>;
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const payload = toServiceOfferingPayload(draft, service?.id);
            await save.mutateAsync(payload);
            toast.success(t(service ? 'admin.services.savedToast' : 'admin.services.createdToast', {name: payload.details.name}));
            onSaved();
        } catch (error) {
            // Details stay in the inline notice below.
            toast.error(error instanceof Error ? error.message : t('admin.services.saveFailed'));
        }
    };
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
                onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <form ref={dialogRef} noValidate role="dialog" aria-modal="true" aria-labelledby="service-dialog-title" onSubmit={e => void submit(e)}
              className="flex max-h-[calc(100dvh-32px)] w-full max-w-lg flex-col gap-4 overflow-y-auto bg-white p-6 shadow-2xl">
            <header className="flex items-center justify-between">
                <h2 id="service-dialog-title" className="text-lg font-bold">{t(service ? 'admin.services.editTitle' : 'admin.services.addTitle')}</h2>
                <button type="button" onClick={onClose} aria-label={t('admin.services.cancel')} className="p-1 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
            </header>
            {service ? <p className="text-[13px] text-slate-600">{t('admin.services.code')}: <span className="font-mono font-semibold">{service.code}</span></p> :
                <label className="text-[13px] font-semibold text-slate-600">{t('admin.services.code')}<RequiredMark/>
                    <input aria-required aria-invalid={Boolean(fieldErrors?.code)} autoFocus value={draft.code} onChange={e => setDraft(prev => ({...prev, code: e.target.value}))}
                           className={cn(field, 'font-mono uppercase')} placeholder="AREA_INSPECTION"/>
                    {fieldErrors?.code ? <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.code}</span> :
                        <span className="mt-1 block text-xs font-normal text-slate-500">{t('admin.services.codeHint')}</span>}</label>}
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.services.name')}<RequiredMark/>
                <input aria-required aria-invalid={Boolean(fieldErrors?.name)} autoFocus={!!service} value={draft.name} onChange={e => setDraft(prev => ({...prev, name: e.target.value}))} className={field}/>
                {fieldErrors?.name && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.name}</span>}</label>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.services.description')}<OptionalMark/>
                <textarea rows={3} aria-invalid={Boolean(fieldErrors?.description)} value={draft.description} onChange={e => setDraft(prev => ({...prev, description: e.target.value}))} className={field}/>
                {fieldErrors?.description && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.description}</span>}</label>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.services.duration')}<RequiredMark/>
                <input aria-required aria-invalid={Boolean(fieldErrors?.defaultDurationMinutes)} type="number" value={draft.defaultDurationMinutes} onChange={e => setDraft(prev => ({...prev, defaultDurationMinutes: e.target.value}))} className={cn(field, 'tabular-nums')}/>
                {fieldErrors?.defaultDurationMinutes && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.defaultDurationMinutes}</span>}</label>
            <fieldset className="grid gap-3 border border-slate-200 p-4">
                <legend className="px-1 text-[13px] font-bold text-slate-700">{t('admin.services.spec.title')}</legend>
                <p className="m-0 text-xs text-slate-500">{t('admin.services.spec.hint')}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-slate-700">{serviceSensors.map(s =>
                    <label key={s} className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={draft.sensors.includes(s)} className="accent-primary"
                               onChange={e => setDraft(prev => ({
                                   ...prev,
                                   sensors: e.target.checked ? [...prev.sensors, s] : prev.sensors.filter(x => x !== s),
                               }))}/>
                        {t(`admin.services.spec.sensor.${s}`)}</label>)}</div>
                <div className="grid grid-cols-2 gap-3">
                    {specField('bestGsdCm', t('admin.services.spec.gsd'), 0.1)}
                    {specField('maxAreaHectares', t('admin.services.spec.area'), 0.1)}
                    {specField('maxWindMs', t('admin.services.spec.wind'), 0.5)}
                    {specField('onSiteHours', t('admin.services.spec.onSite'), 1)}
                    {specField('deliveryHours', t('admin.services.spec.delivery'), 1)}
                </div>
            </fieldset>
            {save.error && !fieldErrors && <ErrorNotice error={save.error}/>}
            <footer className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="h-9 border border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                    {t('admin.services.cancel')}</button>
                <button type="submit" disabled={save.isPending || !canSubmitServiceOffering(draft, Boolean(service))}
                        className="h-9 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">{t('admin.services.save')}</button>
            </footer>
        </form>
    </div>;
}
