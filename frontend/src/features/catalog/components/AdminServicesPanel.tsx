'use client';

import {useState, type FormEvent} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Pencil, Plus, Search, X} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import {FilterSelect} from '@/components/shared/FilterSelect';
import {Switch} from '@/components/ui/Switch';
import {cn} from '@/lib/utils';
import {serviceOfferingsService} from '@/lib/api/services';
import {serviceSensors, type ServiceOffering} from '@/features/catalog/types/service-offering.types';
import {toast} from '@/contexts/ToastContext';

export function AdminServicesPanel() {
    const {user} = useAuth();
    const {t} = useI18n();
    const client = useQueryClient();
    const [search, setSearch] = useState('');
    const [show, setShow] = useState<'all' | 'active' | 'inactive'>('all');
    const [editing, setEditing] = useState<ServiceOffering | 'new' | null>(null);
    const key = ['session', user?.id, 'admin-services'];
    const query = useQuery({queryKey: key, queryFn: ({signal}) => serviceOfferingsService.all(signal)});
    const toggle = useMutation({
        mutationFn: ({id, active}: { id: number; active: boolean }) => serviceOfferingsService.setActive(id, active),
        onSuccess: () => client.invalidateQueries({queryKey: key}),
    });
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
                                onCheckedChange={(nextActive) => {
                                    if (!nextActive && !window.confirm(t('admin.services.deactivateConfirm', {name: s.name}))) return;
                                    toggle.mutate({id: s.id, active: nextActive});
                                }}
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
            void client.invalidateQueries({queryKey: key});
        }}/>}
    </div>;
}

function ServiceDialog({service, onClose, onSaved}: { service: ServiceOffering | null; onClose: () => void; onSaved: () => void }) {
    const {t} = useI18n();
    const [code, setCode] = useState('');
    const [name, setName] = useState(service?.name ?? '');
    const [description, setDescription] = useState(service?.description ?? '');
    const [minutes, setMinutes] = useState(String(service?.defaultDurationMinutes ?? 60));
    const [sensors, setSensors] = useState<string[]>(service?.sensors ?? []);
    const [spec, setSpec] = useState({
        bestGsdCm: service?.bestGsdCm?.toString() ?? '', maxAreaHectares: service?.maxAreaHectares?.toString() ?? '',
        maxWindMs: service?.maxWindMs?.toString() ?? '', onSiteHours: service?.onSiteHours?.toString() ?? '',
        deliveryHours: service?.deliveryHours?.toString() ?? '',
    });
    const optional = (v: string) => v.trim() === '' ? null : Number(v);
    const save = useMutation({
        mutationFn: async () => {
            const body = {name: name.trim(), description: description.trim() || undefined, defaultDurationMinutes: Number(minutes)};
            const specs = {
                sensors, bestGsdCm: optional(spec.bestGsdCm), maxAreaHectares: optional(spec.maxAreaHectares), maxWindMs: optional(spec.maxWindMs),
                onSiteHours: optional(spec.onSiteHours), deliveryHours: optional(spec.deliveryHours),
            };
            if (service) return serviceOfferingsService.update(service.id, {...body, ...specs});
            // Creation takes the identity only; the technical sheet is stored with a follow-up update.
            const created = await serviceOfferingsService.create({...body, code: code.trim().toUpperCase()});
            return serviceOfferingsService.update(created.id, {...body, ...specs});
        },
    });
    const specField = (key: keyof typeof spec, label: string, min: number, max: number, step: number) =>
        <label className="text-[13px] font-semibold text-slate-600">{label}
            <input type="number" step={step} value={spec[key]} placeholder={t('admin.services.spec.notCommitted')}
                   onChange={e => setSpec(prev => ({...prev, [key]: e.target.value}))} className={cn(field, 'tabular-nums')}/></label>;
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await save.mutateAsync();
            toast.success(t(service ? 'admin.services.savedToast' : 'admin.services.createdToast', {name: name.trim()}));
            onSaved();
        } catch (error) {
            // Details stay in the inline notice below.
            toast.error(error instanceof Error ? error.message : t('admin.services.saveFailed'));
        }
    };
    const field = 'mt-1 w-full border border-slate-200 px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none';
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
                onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <form role="dialog" aria-modal="true" aria-labelledby="service-dialog-title" onSubmit={e => void submit(e)}
              onKeyDown={e => e.key === 'Escape' && onClose()}
              className="flex max-h-[calc(100dvh-32px)] w-full max-w-lg flex-col gap-4 overflow-y-auto bg-white p-6 shadow-2xl">
            <header className="flex items-center justify-between">
                <h2 id="service-dialog-title" className="text-lg font-bold">{t(service ? 'admin.services.editTitle' : 'admin.services.addTitle')}</h2>
                <button type="button" onClick={onClose} aria-label={t('admin.services.cancel')} className="p-1 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
            </header>
            {service ? <p className="text-[13px] text-slate-600">{t('admin.services.code')}: <span className="font-mono font-semibold">{service.code}</span></p> :
                <label className="text-[13px] font-semibold text-slate-600">{t('admin.services.code')}<RequiredMark/>
                    <input aria-required autoFocus value={code} onChange={e => setCode(e.target.value)}
                           className={cn(field, 'font-mono uppercase')} placeholder="AREA_INSPECTION"/>
                    <span className="mt-1 block text-xs font-normal text-slate-500">{t('admin.services.codeHint')}</span></label>}
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.services.name')}<RequiredMark/>
                <input aria-required autoFocus={!!service} value={name} onChange={e => setName(e.target.value)} className={field}/></label>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.services.description')}<OptionalMark/>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={field}/></label>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.services.duration')}<RequiredMark/>
                <input aria-required type="number" value={minutes} onChange={e => setMinutes(e.target.value)} className={cn(field, 'tabular-nums')}/></label>
            <fieldset className="grid gap-3 border border-slate-200 p-4">
                <legend className="px-1 text-[13px] font-bold text-slate-700">{t('admin.services.spec.title')}</legend>
                <p className="m-0 text-xs text-slate-500">{t('admin.services.spec.hint')}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-slate-700">{serviceSensors.map(s =>
                    <label key={s} className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={sensors.includes(s)} className="accent-primary"
                               onChange={e => setSensors(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s))}/>
                        {t(`admin.services.spec.sensor.${s}`)}</label>)}</div>
                <div className="grid grid-cols-2 gap-3">
                    {specField('bestGsdCm', t('admin.services.spec.gsd'), 0.1, 100, 0.1)}
                    {specField('maxAreaHectares', t('admin.services.spec.area'), 0.1, 100000, 0.1)}
                    {specField('maxWindMs', t('admin.services.spec.wind'), 1, 40, 0.5)}
                    {specField('onSiteHours', t('admin.services.spec.onSite'), 1, 720, 1)}
                    {specField('deliveryHours', t('admin.services.spec.delivery'), 1, 2160, 1)}
                </div>
            </fieldset>
            <ErrorNotice error={save.error}/>
            <footer className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="h-9 border border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                    {t('admin.services.cancel')}</button>
                <button type="submit" disabled={save.isPending}
                        className="h-9 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">{t('admin.services.save')}</button>
            </footer>
        </form>
    </div>;
}
