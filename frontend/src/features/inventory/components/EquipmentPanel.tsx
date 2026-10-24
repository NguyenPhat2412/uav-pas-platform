'use client';
import {useRef, useState} from 'react';
import {Button, Input} from '@/components/ui';
import {useAuth} from '@/contexts/AuthContext';
import {useInventoryHistory, useOperationMutation} from "@/hooks/useOperations";
import {useCollection} from "@/hooks/useCollections";
import {operationsService} from "@/lib/api/resources";
import {DataTable, options} from '@/components/data/DataTable';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {Pagination} from "@/components/data/ResourceState";
import {displayLabel, formatDate} from "@/components/shared/presentation";
import type {Equipment} from "@/types/resources";
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

export function EquipmentPanel() {
    const {can} = useAuth();
    const {t} = useI18n();
    const collection = useCollection('equipment');
    const [historyPage, setHistoryPage] = useState(0);
    const history = useInventoryHistory(historyPage);
    const stations = useCollection('stations');
    const [openCreate, setOpenCreate] = useState(false);
    const [form, setForm] = useState({name: '', type: 'BATTERY', serialNumber: '', stationId: ''});
    const [movement, setMovement] = useState({id: '', action: 'stock-in', quantity: '1', note: '', stationId: ''});
    const replay = useRef<{ payload: string; requestId: string } | null>(null);
    const [success, setSuccess] = useState('');
    const create = useOperationMutation(operationsService.createEquipment, ['equipment', 'dashboard', 'audit']);
    const move = useOperationMutation(operationsService.moveEquipment, ['equipment', 'dashboard', 'audit']);
    const rows = collection.data || [];
    const columns = [
        {
            accessorKey: 'name',
            header: t('opsAssets.equipment.equipment'),
            cell: ({row}: { row: { original: Equipment } }) => <div><span
                className="font-semibold text-slate-900">{row.original.name}</span><span
                className="mt-0.5 block text-xs text-slate-500">{row.original.serialNumber || t('opsAssets.equipment.notSerialized')}</span></div>
        },
        {accessorKey: 'type', header: t('opsAssets.equipment.type')},
        {
            accessorKey: 'stationName',
            header: t('opsAssets.equipment.station'),
            cell: ({row}: { row: { original: Equipment } }) => row.original.stationName || t('opsAssets.equipment.unassigned')
        },
        {
            accessorKey: 'quantity',
            header: t('opsAssets.equipment.onHand'),
            cell: ({row}: { row: { original: Equipment } }) => <strong>{row.original.quantity}</strong>
        },
        {accessorKey: 'availableQuantity', header: t('opsAssets.equipment.available')},
        {accessorKey: 'reservedQuantity', header: t('opsAssets.equipment.reserved')},
    ];
    return <div className="space-y-5">
        {can('INVENTORY_MANAGE') && <div className="flex justify-end"><Button size="sm"
                                                                              onClick={() => setOpenCreate(value => !value)}>{openCreate ? t('opsAssets.shared.closeForm') : t('opsAssets.equipment.create')}</Button>
        </div>}
        {openCreate && can('INVENTORY_MANAGE') &&
            <form className="space-y-4 rounded-none border border-border bg-slate-50 p-4" onSubmit={async event => {
                event.preventDefault();
                try {
                    await create.mutateAsync({
                        ...form,
                        serialNumber: form.serialNumber || undefined,
                        stationId: Number(form.stationId) || undefined
                    });
                    setForm({name: '', type: 'BATTERY', serialNumber: '', stationId: ''});
                    setOpenCreate(false);
                    await collection.refetch();
                } catch { /* visible below */
                }
            }}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="equipment-name">{t('opsAssets.equipment.name')}<RequiredMark/></label><Input
                        id="equipment-name" required maxLength={100} value={form.name}
                        onChange={event => setForm({...form, name: event.target.value})}/></div>
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="equipment-type">{t('opsAssets.equipment.type')}</label><select id="equipment-type"
                                                                                                     className="min-h-11 w-full min-w-0 rounded-none border border-slate-300 bg-white px-3 py-2 text-sm"
                                                                                                     value={form.type}
                                                                                                     onChange={event => setForm({
                                                                                                         ...form,
                                                                                                         type: event.target.value
                                                                                                     })}>{['BATTERY', 'CAMERA', 'KV260', 'SENSOR', 'ACCESSORY'].map(type =>
                        <option key={type}>{type}</option>)}</select></div>
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="equipment-serial">{t('opsAssets.equipment.serial')}</label><Input
                        id="equipment-serial" maxLength={100} value={form.serialNumber}
                        onChange={event => setForm({...form, serialNumber: event.target.value})}/></div>
                </div>
                {can('STATION_READ') &&
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="equipment-station">{t('opsAssets.equipment.storageStation')}</label><select id="equipment-station"
                                             className="min-h-11 w-full min-w-0 rounded-none border border-slate-300 bg-white px-3 py-2 text-sm"
                                             disabled={create.isPending || stations.isPending || !!stations.error}
                                             value={form.stationId}
                                             onChange={event => setForm({...form, stationId: event.target.value})}>
                        <option value="">{t('opsAssets.equipment.noStation')}</option>
                        {stations.data?.filter(station => station.status === 'ACTIVE').map(station => <option
                            key={station.id} value={station.id}>{station.code} · {station.name}</option>)}
                    </select><ErrorNotice error={stations.error}/></div>}
                <div className="mt-6 flex flex-wrap justify-end"><Button size="sm" type="submit" isLoading={create.isPending}>{t('opsAssets.equipment.create')}</Button></div>
                <ErrorNotice error={create.error}/></form>}
        {can('INVENTORY_MANAGE') &&
            <form className="rounded-none border border-border bg-slate-50 p-4" onSubmit={async event => {
                event.preventDefault();
                setSuccess('');
                const payload = JSON.stringify(movement);
                if (replay.current?.payload !== payload) replay.current = {payload, requestId: crypto.randomUUID()};
                try {
                    await move.mutateAsync({
                        id: Number(movement.id),
                        action: movement.action,
                        quantity: Number(movement.quantity),
                        note: movement.note || undefined,
                        stationId: Number(movement.stationId) || undefined,
                        requestId: replay.current.requestId
                    });
                    replay.current = null;
                    setSuccess('opsAssets.equipment.movementRecorded');
                    setHistoryPage(0);
                    await collection.refetch();
                } catch { /* same request id is retained for safe retry */
                }
            }}><h3 className="mb-3 text-sm font-semibold text-slate-800">{t('opsAssets.equipment.movementTitle')}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="movement-equipment">{t('opsAssets.equipment.equipment')}<RequiredMark/></label><select
                        id="movement-equipment" className="min-h-11 w-full min-w-0 rounded-none border border-slate-300 bg-white px-3 py-2 text-sm" required value={movement.id}
                        onChange={event => setMovement({...movement, id: event.target.value})}>
                        <option value="">{t('opsAssets.equipment.selectEquipment')}</option>
                        {rows.map(item => <option key={item.id} value={item.id}>{item.name} · #{item.id}</option>)}
                    </select></div>
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="movement-action">{t('opsAssets.equipment.action')}</label><select
                        id="movement-action" className="min-h-11 w-full min-w-0 rounded-none border border-slate-300 bg-white px-3 py-2 text-sm" value={movement.action} onChange={event => setMovement({
                        ...movement,
                        action: event.target.value
                    })}>{[['stock-in', t('opsAssets.equipment.actions.stockIn')], ['stock-out', t('opsAssets.equipment.actions.stockOut')], ['reserve', t('opsAssets.equipment.actions.reserve')], ['release', t('opsAssets.equipment.actions.release')], ['transfer', t('opsAssets.equipment.actions.transfer')]].map(([value, label]) =>
                        <option key={value} value={value}
                                disabled={value === 'transfer' && !can('STATION_READ')}>{label}</option>)}</select>
                    </div>
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="movement-quantity">{t('opsAssets.equipment.quantity')}<RequiredMark/></label><Input
                        id="movement-quantity" required type="number" min={1} step={1} value={movement.quantity}
                        onChange={event => setMovement({...movement, quantity: event.target.value})}/></div>
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="movement-note">{t('opsAssets.equipment.note')}</label><Input id="movement-note"
                                                                                                     maxLength={255}
                                                                                                     value={movement.note}
                                                                                                     onChange={event => setMovement({
                                                                                                         ...movement,
                                                                                                         note: event.target.value
                                                                                                     })}/></div>
                </div>
                {movement.action === 'transfer' &&
                    <div className="mt-3 flex max-w-sm flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="movement-station">{t('opsAssets.equipment.targetStation')}<RequiredMark/></label><select
                        id="movement-station" className="min-h-11 w-full min-w-0 rounded-none border border-slate-300 bg-white px-3 py-2 text-sm" disabled={stations.isPending || !!stations.error || move.isPending}
                        required value={movement.stationId}
                        onChange={event => setMovement({...movement, stationId: event.target.value})}>
                        <option value="">{t('opsAssets.equipment.selectTargetStation')}</option>
                        {stations.data?.filter(station => station.status === 'ACTIVE').map(station => <option
                            key={station.id} value={station.id}>{station.code}</option>)}</select></div>}
                <div className="mt-4 flex items-center gap-3"><Button size="sm" type="submit" isLoading={move.isPending}
                                                                      disabled={movement.action === 'transfer' && (!can('STATION_READ') || stations.isPending || !!stations.error)}>{t('opsAssets.equipment.record')}</Button>{success && <span role="status" className="text-sm text-uav-blue">{t(success)}</span>}
                </div>
                <ErrorNotice error={move.error}/></form>}
        <QueryState query={collection}><DataTable label={t('opsAssets.equipment.tableLabel')} data={rows} columns={columns} filters={[{
            column: 'type',
            label: t('opsAssets.equipment.type'),
            options: options(rows.map(row => row.type))
        }, {column: 'stationName', label: t('opsAssets.equipment.station'), options: options(rows.map(row => row.stationName))}]}/></QueryState>
        <section aria-label={t('opsAssets.equipment.history')} className="space-y-3"><h3
            className="text-base font-semibold text-slate-800">{t('opsAssets.equipment.history')}</h3><QueryState query={history}>
            <div className="overflow-auto rounded-none border border-border bg-card">
                <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                    <caption className="sr-only">{t('opsAssets.equipment.historyCaption')}</caption>
                    <thead>
                    <tr>
                        <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-600">{t('opsAssets.equipment.time')}</th>
                        <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-600">{t('opsAssets.equipment.equipment')}</th>
                        <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-600">{t('opsAssets.equipment.action')}</th>
                        <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-600">{t('opsAssets.equipment.quantity')}</th>
                        <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-600">{t('opsAssets.equipment.station')}</th>
                        <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-600">{t('opsAssets.equipment.handledBy')}</th>
                        <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-600">{t('opsAssets.equipment.note')}</th>
                    </tr>
                    </thead>
                    <tbody>{(history.data?.content || []).map(item => <tr key={item.id} className="transition-colors hover:bg-slate-50">
                        <td className="border-b border-slate-100 px-4 py-3.5 align-middle text-slate-700">{formatDate(item.createdAt)}</td>
                        <td className="border-b border-slate-100 px-4 py-3.5 align-middle font-semibold text-slate-900">{item.equipmentName}</td>
                        <td className="border-b border-slate-100 px-4 py-3.5 align-middle text-slate-700">{displayLabel(item.type)}</td>
                        <td className="border-b border-slate-100 px-4 py-3.5 align-middle text-slate-700">{item.quantity}</td>
                        <td className="border-b border-slate-100 px-4 py-3.5 align-middle text-slate-700">{String(item.fromStationId || '—') + ' → ' + String(item.toStationId || '—')}</td>
                        <td className="border-b border-slate-100 px-4 py-3.5 align-middle text-slate-700">{item.actor || '—'}</td>
                        <td className="border-b border-slate-100 px-4 py-3.5 align-middle text-slate-700">{item.note || '—'}</td>
                    </tr>)}{!history.data?.content.length && <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500">{t('opsAssets.equipment.noHistory')}</td>
                    </tr>}</tbody>
                </table>
            </div>
            <Pagination page={historyPage} pages={history.data?.totalPages} onPage={setHistoryPage}/>
        </QueryState></section>
    </div>;
}
