'use client';

import {useState, type FormEvent} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Check, Minus, Pencil, Plus, X} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {planName} from '@/components/shared/presentation';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import {Switch} from '@/components/ui/Switch';
import {cn} from '@/lib/utils';
import {plansService} from '@/lib/api/services';
import type {ServicePlan} from '@/types';

/** BASIC is assigned to every new customer, so the backend refuses to deactivate it. */
const DEFAULT_PLAN = 'BASIC';

export function AdminPlansManager() {
    const {t, formatCurrency} = useI18n();
    const client = useQueryClient();
    const [editing, setEditing] = useState<ServicePlan | 'new' | null>(null);
    const query = useQuery({queryKey: ['admin', 'billing', 'plans', 'all'], queryFn: ({signal}) => plansService.all(signal)});
    // The quota editor reads ['admin','billing','plans'] (active plans only); refresh both views together.
    const refresh = () => client.invalidateQueries({queryKey: ['admin', 'billing', 'plans']});
    const toggle = useMutation({
        mutationFn: ({id, active}: { id: number; active: boolean }) => plansService.setActive(id, active),
        onSuccess: refresh,
    });

    return <section className="border border-slate-200 bg-white">
        <header className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-100 px-4 py-3">
            <button type="button" onClick={() => setEditing('new')}
                    className="inline-flex h-9 items-center gap-1.5 bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:opacity-90">
                <Plus size={15} aria-hidden="true"/>{t('admin.plans.add')}</button>
        </header>
        <ErrorNotice error={toggle.error}/>
        <QueryState query={query}>{query.data?.length ? <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.plans.table')}>
            <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
                <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                    <th className="px-4 py-3">{t('admin.plans.col.plan')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.plans.col.price')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.plans.col.hours')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.plans.col.uavs')}</th>
                    <th className="px-4 py-3 text-center">{t('admin.plans.col.sarAi')}</th>
                    <th className="w-36 px-4 py-3">{t('admin.plans.col.status')}</th>
                    <th className="w-16 px-4 py-3"/>
                </tr>
                </thead>
                <tbody>{query.data.map(p => {
                    const locked = p.code === DEFAULT_PLAN && p.active;
                    return <tr key={p.id} className={cn('border-t border-slate-100 align-top', !p.active && 'bg-slate-50/60 text-slate-500')}>
                        <td className="px-4 py-3"><strong className="block text-slate-900">{planName(p.name)}</strong>
                            <span className="font-mono text-[11.5px] text-slate-500">{p.code}</span>
                            {p.description && <span className="mt-0.5 block text-xs text-slate-500">{p.description}</span>}</td>
                        <td className="px-4 py-3 text-right tabular-nums"><strong className="text-slate-900">{formatCurrency(p.price)}</strong>
                            <span className="block text-xs text-slate-500">{t(`admin.plans.cycle.${p.billingCycle}`)}</span></td>
                        <td className="px-4 py-3 text-right tabular-nums">{t('admin.plans.hours', {count: p.maxMonthlyFlightHours})}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{p.maxConcurrentUavs}</td>
                        <td className="px-4 py-3 text-center">{p.allowSarAi
                            ? <Check size={16} className="inline text-primary" aria-label={t('admin.plans.yes')}/>
                            : <Minus size={16} className="inline text-slate-300" aria-label={t('admin.plans.no')}/>}</td>
                        <td className="px-4 py-3">
                            <Switch
                                checked={p.active}
                                disabled={toggle.isPending || locked}
                                title={locked ? t('admin.plans.defaultLocked') : undefined}
                                aria-label={t('admin.plans.toggleLabel', {name: planName(p.name)})}
                                label={t(p.active ? 'admin.plans.active' : 'admin.plans.inactive')}
                                onCheckedChange={(nextActive) => {
                                    if (!nextActive && !window.confirm(t('admin.plans.deactivateConfirm', {name: planName(p.name)}))) return;
                                    toggle.mutate({id: p.id, active: nextActive});
                                }}
                            />
                            {locked && <span className="mt-1 block text-[11px] text-slate-400">{t('admin.plans.defaultLocked')}</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => setEditing(p)} aria-label={t('admin.plans.edit', {name: planName(p.name)})}
                                    className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Pencil size={15}/></button>
                        </td>
                    </tr>;
                })}</tbody>
            </table>
        </div> : <p className="px-6 py-10 text-center text-[13px] text-slate-500">{t('admin.plans.empty')}</p>}</QueryState>
        {editing && <PlanDialog plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => {
            setEditing(null);
            void refresh();
        }}/>}
    </section>;
}

function PlanDialog({plan, onClose, onSaved}: { plan: ServicePlan | null; onClose: () => void; onSaved: () => void }) {
    const {t} = useI18n();
    const [code, setCode] = useState('');
    const [name, setName] = useState(plan?.name ?? '');
    const [price, setPrice] = useState(String(plan?.price ?? ''));
    const [cycle, setCycle] = useState(plan?.billingCycle ?? 'MONTHLY');
    const [hours, setHours] = useState(String(plan?.maxMonthlyFlightHours ?? 20));
    const [uavs, setUavs] = useState(String(plan?.maxConcurrentUavs ?? 1));
    const [sarAi, setSarAi] = useState(plan?.allowSarAi ?? false);
    const [description, setDescription] = useState(plan?.description ?? '');
    const save = useMutation({
        mutationFn: () => {
            const body = {
                name: name.trim(), price: Number(price), billingCycle: cycle, maxMonthlyFlightHours: Number(hours),
                maxConcurrentUavs: Number(uavs), allowSarAi: sarAi, description: description.trim() || undefined
            };
            return plan ? plansService.update(plan.id, body) : plansService.create({...body, code: code.trim().toUpperCase()});
        },
    });
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await save.mutateAsync();
            onSaved();
        } catch {/* Shown below. */
        }
    };
    const field = 'mt-1 w-full border border-slate-200 px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none';
    const label = 'block text-[13px] font-semibold text-slate-600';
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
                onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <form role="dialog" aria-modal="true" aria-labelledby="plan-dialog-title" onSubmit={e => void submit(e)}
              onKeyDown={e => e.key === 'Escape' && onClose()}
              className="flex max-h-[calc(100dvh-32px)] w-full max-w-xl flex-col gap-4 overflow-y-auto bg-white p-6 shadow-2xl">
            <header className="flex items-center justify-between">
                <h2 id="plan-dialog-title" className="text-lg font-bold">{t(plan ? 'admin.plans.editTitle' : 'admin.plans.addTitle')}</h2>
                <button type="button" onClick={onClose} aria-label={t('admin.plans.cancel')} className="p-1 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
            </header>
            {plan ? <p className="m-0 text-[13px] text-slate-600">{t('admin.plans.code')}: <span className="font-mono font-semibold">{plan.code}</span></p> :
                <label className={label}>{t('admin.plans.code')}<RequiredMark/>
                    <input aria-required autoFocus value={code} onChange={e => setCode(e.target.value)}
                           className={cn(field, 'font-mono uppercase')} placeholder="ENTERPRISE"/>
                    <span className="mt-1 block text-xs font-normal text-slate-500">{t('admin.plans.codeHint')}</span></label>}
            <label className={label}>{t('admin.plans.name')}<RequiredMark/>
                <input aria-required autoFocus={!!plan} value={name} onChange={e => setName(e.target.value)} className={field}/></label>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}>{t('admin.plans.price')}<RequiredMark/>
                    <input aria-required type="number" step={1000} value={price} onChange={e => setPrice(e.target.value)} className={cn(field, 'tabular-nums')}/></label>
                <label className={label}>{t('admin.plans.cycleLabel')}<RequiredMark/>
                    <select value={cycle} onChange={e => setCycle(e.target.value)} className={field}>
                        <option value="MONTHLY">{t('admin.plans.cycle.MONTHLY')}</option>
                        <option value="YEARLY">{t('admin.plans.cycle.YEARLY')}</option>
                    </select></label>
                <label className={label}>{t('admin.plans.hoursLabel')}<RequiredMark/>
                    <input aria-required type="number" step={0.5} value={hours} onChange={e => setHours(e.target.value)} className={cn(field, 'tabular-nums')}/></label>
                <label className={label}>{t('admin.plans.uavsLabel')}<RequiredMark/>
                    <input aria-required type="number" value={uavs} onChange={e => setUavs(e.target.value)} className={cn(field, 'tabular-nums')}/></label>
            </div>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
                <input type="checkbox" checked={sarAi} onChange={e => setSarAi(e.target.checked)}/>{t('admin.plans.sarAiLabel')}</label>
            <label className={label}>{t('admin.plans.description')}<OptionalMark/>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={field}/></label>
            {plan && <p className="m-0 text-xs text-slate-500">{t('admin.plans.editNote')}</p>}
            <ErrorNotice error={save.error}/>
            <footer className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="h-9 border border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                    {t('admin.plans.cancel')}</button>
                <button type="submit" disabled={save.isPending}
                        className="h-9 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">{t('admin.plans.save')}</button>
            </footer>
        </form>
    </div>;
}
