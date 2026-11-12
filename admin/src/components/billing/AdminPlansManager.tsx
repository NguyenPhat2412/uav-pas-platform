'use client';

import {useRef, useState, type FormEvent} from 'react';
import {Check, Minus, Pencil, Plus, X} from 'lucide-react';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {confirmDialog} from '@/providers/ConfirmContext';
import {useI18n} from '@/providers/I18nContext';
import {planName} from '@/lib/presentation';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import {Switch} from '@/components/ui/Switch';
import {cn} from '@/lib/utils';
import {useAllPlans, usePlanMutations, usePlanStats} from '@/hooks/billing/useBillingAdmin';
import {
    canSubmitServicePlan,
    createServicePlanDraft,
    servicePlanFieldErrors,
    toServicePlanPayload,
} from '@/forms/billing/billing-form';
import type {ServicePlan} from '@/types';
import type {PlanStatsRow} from '@/types/billing/billing.types';
import {clampPercent} from '@/utils/billing/plan-stats';
import {AdminPlanStats} from '@/components/billing/AdminPlanStats';

/** BASIC is assigned to every new customer, so the backend refuses to deactivate it. */

export function AdminPlansManager() {
    const {t, formatCurrency} = useI18n();
    const [editing, setEditing] = useState<ServicePlan | 'new' | null>(null);
    const [months, setMonths] = useState(6);
    const query = useAllPlans();
    const stats = usePlanStats(months);
    const statsByPlan = new Map((stats.data?.plans ?? []).map(row => [row.planId, row]));
    // Active plans, every plan and the statistics share one key prefix, so a refresh updates all three.
    const {toggle, refreshPlans: refresh} = usePlanMutations();

    return <>
        <AdminPlanStats query={stats} months={months} onMonthsChange={setMonths}/>
        <section className="border border-slate-200 bg-white">
            <header className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-100 px-4 py-3">
                <button type="button" onClick={() => setEditing('new')}
                        className="inline-flex h-9 items-center gap-1.5 bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:opacity-90">
                    <Plus size={15} aria-hidden="true"/>{t('admin.plans.add')}</button>
            </header>
            <ErrorNotice error={toggle.error}/>
            <QueryState query={query}>{query.data?.length ? <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.plans.table')}>
                <table className="w-full min-w-[920px] border-collapse text-left text-[13px]">
                    <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                        <th className="px-4 py-3">{t('admin.plans.col.plan')}</th>
                        <th className="px-4 py-3 text-right">{t('admin.plans.col.price')}</th>
                        <th className="px-4 py-3">{t('admin.plans.col.limits')}</th>
                        <th className="px-4 py-3 text-right">{t('admin.plans.col.customers')}</th>
                        <th className="px-4 py-3 text-right">{t('admin.plans.col.pending')}</th>
                        <th className="px-4 py-3 text-right">{t('admin.plans.col.revenueMonth')}</th>
                        <th className="w-32 px-4 py-3">{t('admin.plans.col.avgUsage')}</th>
                        <th className="w-36 px-4 py-3">{t('admin.plans.col.status')}</th>
                        <th className="w-16 px-4 py-3"/>
                    </tr>
                    </thead>
                    <tbody>{query.data.map(p => {
                        return <tr key={p.id} className={cn('border-t border-slate-100 align-top', !p.active && 'bg-slate-50/60 text-slate-500')}>
                            <td className="px-4 py-3"><strong className="block text-slate-900">{planName(p.name)}</strong>
                                <span className="font-mono text-[11.5px] text-slate-500">{p.code}</span>
                                {p.description && <span className="mt-0.5 line-clamp-2 block max-w-56 text-xs text-slate-500" title={p.description}>{p.description}</span>}</td>
                            <td className="px-4 py-3 text-right tabular-nums"><strong className="text-slate-900">{formatCurrency(p.price)}</strong>
                                <span className="block text-xs text-slate-500">{t(`admin.plans.cycle.${p.billingCycle}`)}</span></td>
                            {/* Hours, UAVs and SAR/AI share one column so the table fits beside the statistics. */}
                            <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                                <span className="block text-slate-900">{t('admin.plans.hours', {count: p.maxMonthlyFlightHours})}</span>
                                <span className="block text-xs text-slate-500">{t('admin.plans.uavsCount', {count: p.maxConcurrentUavs})}</span>
                                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">{p.allowSarAi
                                    ? <Check size={13} className="text-slate-700" aria-label={t('admin.plans.yes')}/>
                                    : <Minus size={13} className="text-slate-300" aria-label={t('admin.plans.no')}/>}{t('admin.plans.col.sarAi')}</span>
                            </td>
                            <PlanStatCells row={statsByPlan.get(p.id)} loading={stats.isPending}/>
                            <td className="px-4 py-3">
                                <Switch
                                    checked={p.active}
                                    disabled={toggle.isPending}
                                    aria-label={t('admin.plans.toggleLabel', {name: planName(p.name)})}
                                    label={t(p.active ? 'admin.plans.active' : 'admin.plans.inactive')}
                                    onCheckedChange={(nextActive) => void (async () => {
                                        if (!nextActive && !(await confirmDialog(t('admin.plans.deactivateConfirm', {name: planName(p.name)})))) return;
                                        toggle.mutate({id: p.id, active: nextActive});
                                    })()}
                                />
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
        </section>
    </>;
}

/** Customers, open invoices, revenue and usage for one table row, joined from the stats by plan id. */
function PlanStatCells({row, loading}: { row?: PlanStatsRow; loading: boolean }) {
    const {t, formatCurrency, formatNumber} = useI18n();
    if (!row) {
        const empty = <span className="text-slate-300">{loading ? '…' : '—'}</span>;
        return <>
            <td className="px-4 py-3 text-right">{empty}</td>
            <td className="px-4 py-3 text-right">{empty}</td>
            <td className="px-4 py-3 text-right">{empty}</td>
            <td className="px-4 py-3">{empty}</td>
        </>;
    }
    const usage = row.avgUsagePercent;
    return <>
        <td className="px-4 py-3 text-right tabular-nums"><strong className="text-slate-900">{row.payingSubscribers}</strong>
            <span className="text-slate-500">/{row.subscribers}</span></td>
        <td className="px-4 py-3 text-right tabular-nums">
            <span className="text-slate-900">{row.pendingInvoices.count} · {formatCurrency(row.pendingInvoices.amount)}</span>
            {row.overdueInvoices.count > 0 && <span className="block text-xs font-semibold text-[#c43a4a]">
                {t('admin.plans.overdueCount', {count: row.overdueInvoices.count})}</span>}</td>
        <td className="px-4 py-3 text-right tabular-nums"><strong className="text-slate-900">{formatCurrency(row.revenueThisMonth)}</strong>
            <span className="block text-xs text-slate-500">{t('admin.plans.revenueTotal', {amount: formatCurrency(row.revenueTotal)})}</span></td>
        <td className="px-4 py-3">
            <span className={cn('block text-right font-mono text-xs font-semibold tabular-nums', usage >= 80 ? 'text-[#c43a4a]' : 'text-slate-700')}>
                {formatNumber(usage, {maximumFractionDigits: 1})}%</span>
            <span className="mt-1 block h-1.5 bg-slate-100" aria-hidden="true">
                <span className={cn('block h-full', usage >= 80 ? 'bg-[#c43a4a]' : 'bg-slate-500')} style={{width: `${clampPercent(usage)}%`}}/></span>
        </td>
    </>;
}

function PlanDialog({plan, onClose, onSaved}: { plan: ServicePlan | null; onClose: () => void; onSaved: () => void }) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLFormElement>(null);
    useDialogFocusTrap(dialogRef, true, onClose);
    const [draft, setDraft] = useState(() => createServicePlanDraft(plan));
    const {save} = usePlanMutations();
    const fieldErrors = servicePlanFieldErrors(save.error);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await save.mutateAsync({
                id: plan?.id,
                body: toServicePlanPayload(draft),
            });
            onSaved();
        } catch {/* Shown below. */
        }
    };
    const field = 'mt-1 w-full border border-slate-200 px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none aria-[invalid=true]:border-danger';
    const label = 'block text-[13px] font-semibold text-slate-600';
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
                onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <form ref={dialogRef} noValidate role="dialog" aria-modal="true" aria-labelledby="plan-dialog-title" onSubmit={e => void submit(e)}
              className="flex max-h-[calc(100dvh-32px)] w-full max-w-xl flex-col gap-4 overflow-y-auto bg-white p-6 shadow-2xl">
            <header className="flex items-center justify-between">
                <h2 id="plan-dialog-title" className="text-lg font-bold">{t(plan ? 'admin.plans.editTitle' : 'admin.plans.addTitle')}</h2>
                <button type="button" onClick={onClose} aria-label={t('admin.plans.cancel')} className="p-1 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
            </header>
            {plan ? <p className="m-0 text-[13px] text-slate-600">{t('admin.plans.code')}: <span className="font-mono font-semibold">{plan.code}</span></p> :
                <label className={label}>{t('admin.plans.code')}<RequiredMark/>
                    <input aria-required aria-invalid={Boolean(fieldErrors?.code)} autoFocus value={draft.code} onChange={e => setDraft(f => ({...f, code: e.target.value}))}
                           className={cn(field, 'font-mono uppercase')} placeholder="ENTERPRISE"/>
                    {fieldErrors?.code ? <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.code}</span> :
                        <span className="mt-1 block text-xs font-normal text-slate-500">{t('admin.plans.codeHint')}</span>}</label>}
            <label className={label}>{t('admin.plans.name')}<RequiredMark/>
                <input aria-required aria-invalid={Boolean(fieldErrors?.name)} autoFocus={!!plan} value={draft.name} onChange={e => setDraft(f => ({...f, name: e.target.value}))} className={field}/>
                {fieldErrors?.name && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.name}</span>}</label>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}>{t('admin.plans.price')}<RequiredMark/>
                    <input aria-required aria-invalid={Boolean(fieldErrors?.price)} type="number" step={1000} value={draft.price} onChange={e => setDraft(f => ({...f, price: e.target.value}))} className={cn(field, 'tabular-nums')}/>
                    {fieldErrors?.price && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.price}</span>}</label>
                <label className={label}>{t('admin.plans.cycleLabel')}<RequiredMark/>
                    <select value={draft.billingCycle} onChange={e => setDraft(f => ({...f, billingCycle: e.target.value}))} className={field}>
                        <option value="MONTHLY">{t('admin.plans.cycle.MONTHLY')}</option>
                        <option value="YEARLY">{t('admin.plans.cycle.YEARLY')}</option>
                    </select></label>
                <label className={label}>{t('admin.plans.hoursLabel')}<RequiredMark/>
                    <input aria-required aria-invalid={Boolean(fieldErrors?.maxMonthlyFlightHours)} type="number" step={0.5} value={draft.maxMonthlyFlightHours} onChange={e => setDraft(f => ({...f, maxMonthlyFlightHours: e.target.value}))} className={cn(field, 'tabular-nums')}/>
                    {fieldErrors?.maxMonthlyFlightHours && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.maxMonthlyFlightHours}</span>}</label>
                <label className={label}>{t('admin.plans.uavsLabel')}<RequiredMark/>
                    <input aria-required aria-invalid={Boolean(fieldErrors?.maxConcurrentUavs)} type="number" value={draft.maxConcurrentUavs} onChange={e => setDraft(f => ({...f, maxConcurrentUavs: e.target.value}))} className={cn(field, 'tabular-nums')}/>
                    {fieldErrors?.maxConcurrentUavs && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.maxConcurrentUavs}</span>}</label>
            </div>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
                <input type="checkbox" checked={draft.allowSarAi} onChange={e => setDraft(f => ({...f, allowSarAi: e.target.checked}))}/>{t('admin.plans.sarAiLabel')}</label>
            <label className={label}>{t('admin.plans.description')}<OptionalMark/>
                <textarea rows={3} aria-invalid={Boolean(fieldErrors?.description)} value={draft.description} onChange={e => setDraft(f => ({...f, description: e.target.value}))} className={field}/>
                {fieldErrors?.description && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.description}</span>}</label>
            {plan && <p className="m-0 text-xs text-slate-500">{t('admin.plans.editNote')}</p>}
            {save.error && !fieldErrors && <ErrorNotice error={save.error}/>}
            <footer className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="h-9 border border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                    {t('admin.plans.cancel')}</button>
                <button type="submit" disabled={save.isPending || !canSubmitServicePlan(draft, Boolean(plan))}
                        className="h-9 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">{t('admin.plans.save')}</button>
            </footer>
        </form>
    </div>;
}
