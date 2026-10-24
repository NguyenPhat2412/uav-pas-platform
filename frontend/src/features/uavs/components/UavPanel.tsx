'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {Plus} from 'lucide-react';
import {Button, Input, StatusBadge} from '@/components/ui';
import {useAuth} from '@/contexts/AuthContext';
import {useOperationMutation, useUav, useUavHistory} from "@/hooks/useOperations";
import {useCollection} from "@/hooks/useCollections";
import {operationsService} from "@/lib/api/resources";
import {DataTable, options} from '@/components/data/DataTable';
import {Drawer, Metadata, Tabs} from '@/components/data/Drawer';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {UavModelViewer} from '@/components/visuals/UavModelViewer';
import {Pagination} from "@/components/data/ResourceState";
import {UavLifecyclePanel} from "@/features/uavs/components/UavLifecyclePanel";
import {uavHistoryReason} from "@/features/uavs/utils/workflows";
import {displayLabel, formatDate} from "@/components/shared/presentation";
import type {Uav} from "@/types/resources";
import {RequiredMark} from "@/components/shared/RequiredMark";
import {resolveUavIdFromParam, toUavSlug} from "@/lib/url-slugs";
import {useI18n} from '@/contexts/I18nContext';

const validUavTabs = new Set(['overview', 'maintenance', 'assignment', 'activity', 'media']);

export function UavPanel() {
    const {can} = useAuth();
    const {t} = useI18n();
    const query = useCollection('uavs');
    const stations = useCollection('stations');
    const [selected, setSelected] = useState<number>();
    const detail = useUav(selected);
    const [historyPage, setHistoryPage] = useState(0);
    const history = useUavHistory(selected, historyPage);
    const [tab, setTab] = useState('overview');
    const [show3d, setShow3d] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [form, setForm] = useState({model: '', serialNumber: '', manufacturer: ''});
    const create = useOperationMutation(operationsService.createUav, ['uavs', 'dashboard', 'audit']);
    const [lifecycleBusy, setLifecycleBusy] = useState(false);
    const rows = query.data || [];

    const syncUavUrl = (uavId?: number, nextTab = 'overview') => {
        if (typeof window === 'undefined') return;
        if (!uavId) {
            window.history.replaceState(null, '', window.location.pathname);
            return;
        }
        const matched = rows.find(item => item.id === uavId) ?? (detail.data?.id === uavId ? detail.data : undefined);
        const slug = matched ? toUavSlug(matched) : String(uavId);
        const search = new URLSearchParams();
        search.set('uav', slug);
        if (nextTab && nextTab !== 'overview') search.set('tab', nextTab);
        window.history.replaceState(null, '', `${window.location.pathname}?${search.toString()}`);
    };

    useEffect(() => {
        if (typeof window === 'undefined' || selected !== undefined) return;
        const params = new URLSearchParams(window.location.search);
        const resolved = resolveUavIdFromParam(params.get('uav'), params.get('uavId'), rows);
        if (resolved) {
            const id = Number(resolved);
            if (Number.isSafeInteger(id) && id > 0) {
                setSelected(id);
                const requestedTab = params.get('tab');
                if (requestedTab && validUavTabs.has(requestedTab)) setTab(requestedTab);
            }
        }
    }, [rows, selected]);

    const refreshUav = async () => {
        const results = await Promise.all([query.refetch(), detail.refetch(), history.refetch(), ...(can('STATION_READ') ? [stations.refetch()] : [])]);
        return results.every(result => !result.isError);
    };
    const openUav = (id: number, nextTab = 'overview') => {
        if (lifecycleBusy) return;
        setSelected(id);
        setHistoryPage(0);
        setTab(nextTab);
        setShow3d(false);
        syncUavUrl(id, nextTab);
    };
    const columns = [
        {
            id: 'model',
            accessorFn: (uav: Uav) => `${uav.model} ${uav.serialNumber}`,
            header: t('opsAssets.uav.model'),
            cell: ({row}: { row: { original: Uav } }) => <div><span
                className="font-semibold text-slate-900">{row.original.model}</span><span
                className="mt-0.5 block text-xs text-slate-500">{row.original.serialNumber}</span></div>
        },
        {
            accessorKey: 'status',
            header: t('opsAssets.uav.status'),
            cell: ({row}: { row: { original: Uav } }) => <StatusBadge status={row.original.status}/>
        },
        {
            accessorKey: 'stationName',
            header: t('opsAssets.uav.station'),
            cell: ({row}: { row: { original: Uav } }) => row.original.stationName || t('opsAssets.uav.unassigned')
        },
        {
            id: 'actions',
            header: t('opsAssets.uav.actions'),
            enableSorting: false,
            enableHiding: false,
            cell: ({row}: { row: { original: Uav } }) => <div className="flex flex-wrap gap-2"><Button size="sm"
                                                                                                       variant="outline"
                                                                                                       disabled={lifecycleBusy}
                                                                                                       onClick={() => openUav(row.original.id)}>{t('opsAssets.uav.openDetail')}</Button>{can('UAV_MANAGE') && <Button size="sm" variant="outline" disabled={lifecycleBusy}
                                                               onClick={() => openUav(row.original.id, 'maintenance')}>{row.original.status === 'MAINTENANCE' ? t('opsAssets.uav.completeMaintenance') : t('opsAssets.uav.maintenance')}</Button>}
            </div>
        },
    ];
    return <div className="space-y-5">
        {can('UAV_MANAGE') && <div className="flex justify-end"><Button size="sm" leftIcon={<Plus size={15}/>}
                                                                        onClick={() => setOpenCreate(value => !value)}>{openCreate ? t('opsAssets.uav.closeForm') : t('opsAssets.uav.add')}</Button>
        </div>}
        {openCreate && can('UAV_MANAGE') &&
            <form className="space-y-4 rounded-none border border-border bg-slate-50 p-4" onSubmit={async event => {
                event.preventDefault();
                try {
                    await create.mutateAsync(form);
                    setForm({model: '', serialNumber: '', manufacturer: ''});
                    setOpenCreate(false);
                    await query.refetch();
                } catch { /* visible below */
                }
            }}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="uav-model">{t('opsAssets.uav.model')}<RequiredMark/></label><Input id="uav-model" required
                                                                                                 maxLength={100}
                                                                                                 value={form.model}
                                                                                                 onChange={e => setForm({
                                                                                                     ...form,
                                                                                                     model: e.target.value
                                                                                                 })}/></div>
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="uav-serial">{t('opsAssets.uav.serial')}<RequiredMark/></label><Input id="uav-serial"
                                                                                                    required
                                                                                                    maxLength={100}
                                                                                                    value={form.serialNumber}
                                                                                                    onChange={e => setForm({
                                                                                                        ...form,
                                                                                                        serialNumber: e.target.value
                                                                                                    })}/></div>
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="uav-maker">{t('opsAssets.uav.manufacturer')}<RequiredMark/></label><Input id="uav-maker"
                                                                                                      required
                                                                                                      maxLength={120}
                                                                                                      value={form.manufacturer}
                                                                                                      onChange={e => setForm({
                                                                                                          ...form,
                                                                                                          manufacturer: e.target.value
                                                                                                      })}/></div>
                </div>
                <div className="mt-6 flex flex-wrap justify-end"><Button size="sm" type="submit" isLoading={create.isPending}>{t('opsAssets.uav.create')}</Button></div>
                <ErrorNotice error={create.error}/></form>}
        <QueryState query={query}><DataTable label={t('opsAssets.uav.tableLabel')} data={rows} columns={columns} filters={[{
            column: 'status',
            label: t('opsAssets.uav.status'),
            options: options(rows.map(row => row.status))
        }, {column: 'stationName', label: t('opsAssets.uav.station'), options: options(rows.map(row => row.stationName))}]}/></QueryState>
        {selected && <Drawer title={t('opsAssets.uav.detailTitle')} onClose={() => {
            if (!lifecycleBusy) {
                setSelected(undefined);
                syncUavUrl(undefined);
            }
        }} wide><QueryState query={detail}>{detail.data && <>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.8fr)]">
                <div className="space-y-3">
                    <div className="flex items-center justify-between"><h3
                        className="text-sm font-semibold text-slate-800">{t('opsAssets.uav.visualCheck')}</h3><Button size="sm"
                                                                                                        variant="outline"
                                                                                                        onClick={() => setShow3d(value => !value)}>{show3d ? t('opsAssets.uav.close3d') : t('opsAssets.uav.view3d')}</Button>
                    </div>
                    {show3d ? <UavModelViewer serial={detail.data.serialNumber} status={detail.data.status}/> : <div
                        className="flex min-h-[180px] items-center justify-center rounded-none border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">{t('opsAssets.uav.modelOnDemand')}</div>}</div>
                <Metadata
                    items={[[t('opsAssets.uav.model'), detail.data.model], [t('opsAssets.uav.serial'), detail.data.serialNumber], [t('opsAssets.uav.manufacturer'), detail.data.manufacturer], [t('opsAssets.uav.status'),
                        <StatusBadge key="detail-status"
                                     status={detail.data.status}/>], [t('opsAssets.uav.station'), detail.data.stationName || t('opsAssets.uav.unassigned')]]}/>
            </div>
            <Tabs items={[{id: 'overview', label: t('opsAssets.uav.tabs.overview')}, {id: 'maintenance', label: t('opsAssets.uav.tabs.maintenance')}, {
                id: 'assignment',
                label: t('opsAssets.uav.tabs.assignment')
            }, {id: 'activity', label: t('opsAssets.uav.tabs.activity')}, {id: 'media', label: t('opsAssets.uav.tabs.media')}]} value={tab} onChange={value => {
                if (!lifecycleBusy) {
                    setTab(value);
                    syncUavUrl(selected, value);
                }
            }}/>{tab === 'overview' &&
            <p className="text-sm text-slate-600">{t('opsAssets.uav.overviewNote')}</p>}{(tab === 'maintenance' || tab === 'assignment') && (can('UAV_MANAGE') ? <><Link
                href={`/operations/maintenance?uav=${toUavSlug(detail.data)}`}
                className="mb-4 inline-flex min-h-11 items-center rounded-none border border-slate-300 px-4 text-sm font-semibold text-slate-800">{t('opsAssets.uav.openMaintenance')}</Link><UavLifecyclePanel key={`${selected}-${tab}`} uav={detail.data}
                                                                        mode={tab}
                                                                        stations={stations.error ? [] : stations.data || []}
                                                                        canReadStations={can('STATION_READ')}
                                                                        onRefresh={refreshUav}
                                                                        onBusy={setLifecycleBusy}/>{tab === 'assignment' &&
                <ErrorNotice error={stations.error}/>}</> :
            <p className="text-sm text-slate-600">{t('opsAssets.uav.noManagePermission')}</p>)}{tab === 'media' &&
            <p className="text-sm text-slate-600">{t('opsAssets.uav.mediaNote')}</p>}{tab === 'activity' &&
            <QueryState query={history}>
                <div className="space-y-3">{history.data?.content.map(item => <div key={item.id}
                                                                                   className="border-b border-slate-100 pb-3 text-sm">
                    <strong>{(item.fromStatus ? displayLabel(item.fromStatus) : t('opsAssets.uav.newStatus')) + ' → ' + displayLabel(item.toStatus)}</strong>
                    <p className="text-xs text-slate-500">{formatDate(item.createdAt)} · {item.changedBy || '—'}{item.reason ? ' · ' + uavHistoryReason(item.reason, t) : ''}</p>
                </div>)}{!history.data?.content.length &&
                    <p className="text-sm text-slate-600">{t('opsAssets.uav.noHistory')}</p>}<Pagination page={historyPage}
                                                                                                      pages={history.data?.totalPages}
                                                                                                      onPage={setHistoryPage}/>
                </div>
            </QueryState>}</>}</QueryState></Drawer>}
    </div>;
}
