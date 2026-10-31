'use client';
import {useState} from 'react';
import {Button, Input} from '@/components/ui';
import type {MaterialInput, RepairOrder} from "@/types/maintenance/maintenance.types";
import {formatVnd, materialInput} from "@/utils/maintenance/workflows";
import {Feedback} from "@/components/maintenance/Feedback";
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/providers/I18nContext';

export function MaterialEditor({order, disabled, onSave, onCancel}: {
    order: RepairOrder;
    disabled: boolean;
    onSave: (items: MaterialInput[]) => void;
    onCancel: () => void
}) {
    const {t, locale} = useI18n();
    const [items, setItems] = useState<MaterialInput[]>(order.materials.map(({
                                                                                 name,
                                                                                 unit,
                                                                                 quantity,
                                                                                 unitPrice
                                                                             }) => ({
        name,
        unit,
        quantity,
        unitPrice
    })));
    const [error, setError] = useState('');
    const change = (index: number, field: keyof MaterialInput, value: string) => setItems(current => current.map((item, i) => i === index ? {
        ...item,
        [field]: value
    } : item));
    return <form className="space-y-4" aria-label={t('opsAssets.maintenance.materials.form')} onSubmit={event => {
        event.preventDefault();
        setError('');
        onSave(materialInput(items));
    }}><Feedback error={error}/><p className="text-sm text-slate-600">{t('opsAssets.maintenance.materials.notePrefix')}<strong>{t('opsAssets.maintenance.materials.noteStrong')}</strong>{t('opsAssets.maintenance.materials.noteSuffix')}</p>{items.length === 0 &&
        <p className="rounded-panel bg-slate-50 p-4 text-sm">{t('opsAssets.maintenance.materials.empty')}</p>}{items.map((item, index) => <fieldset key={index}
                                                         className="space-y-3 rounded-panel border border-border p-4 disabled:opacity-70"
                                                         disabled={disabled}>
        <legend className="px-1 text-sm font-semibold">{t('opsAssets.maintenance.materials.line', {line: index + 1})}</legend>
        <div className="grid gap-3 sm:grid-cols-2"><label
            className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.materials.name', {line: index + 1})}<RequiredMark/></span><Input aria-required value={item.name}
                                                                             onChange={event => change(index, 'name', event.target.value)}/></label><label
            className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.materials.unit', {line: index + 1})}<RequiredMark/></span><Input aria-required
                                                                                placeholder={t('opsAssets.maintenance.materials.unitPlaceholder')}
                                                                                value={item.unit}
                                                                                onChange={event => change(index, 'unit', event.target.value)}/></label><label
            className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.materials.quantity', {line: index + 1})}<RequiredMark/></span><Input aria-required inputMode="decimal"
                                                                                  type="number"
                                                                                  step="0.001" value={item.quantity}
                                                                                  onChange={event => change(index, 'quantity', event.target.value)}/></label><label
            className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.materials.unitPrice', {line: index + 1})}<RequiredMark/></span><Input aria-required inputMode="numeric"
                                                                                     type="number" step="1"
                                                                                     value={item.unitPrice}
                                                                                     onChange={event => change(index, 'unitPrice', event.target.value)}/></label>
        </div>
        <Button type="button" variant="outline" size="sm"
                onClick={() => setItems(current => current.filter((_, i) => i !== index))}>{t('opsAssets.maintenance.materials.remove', {line: index + 1})}</Button></fieldset>)}<Button type="button" variant="outline"
                                                        disabled={disabled || items.length >= 100}
                                                        onClick={() => setItems(current => [...current, {
                                                            name: '',
                                                            unit: '',
                                                            quantity: '1',
                                                            unitPrice: '0'
                                                        }])}>{t('opsAssets.maintenance.materials.add')}</Button><p
        className="text-sm text-slate-600">{t('opsAssets.maintenance.materials.savedTotal')}<strong>{formatVnd(order.totalMaterialCost, t, locale)}</strong>{t('opsAssets.maintenance.materials.savedTotalNote')}</p>
        <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={disabled}
                                                      onClick={onCancel}>{t('opsAssets.maintenance.materials.discard')}</Button><Button
            type="submit" disabled={disabled}>{t('opsAssets.maintenance.materials.save')}</Button></div>
    </form>;
}
