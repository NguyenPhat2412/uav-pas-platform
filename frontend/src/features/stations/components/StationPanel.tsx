'use client';
import {useEffect, useState} from 'react';
import {Edit3, Plus} from 'lucide-react';
import {Button, Input, StatusBadge} from '@/components/ui';
import {useAuth} from '@/contexts/AuthContext';
import {useOperationMutation, useStation} from '@/lib/query/operations';
import {useCollection} from '@/lib/query/operations';
import {operationsService} from "@/lib/api/resources";
import {DataTable, options} from '@/components/data/DataTable';
import {Drawer, Metadata, Tabs} from '@/components/data/Drawer';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {SectionHeading} from '@/components/layout/PageHeader';
import type {Station} from "@/types/resources";
import {OptionalMark, RequiredMark} from "@/components/shared/RequiredMark";
import {resolveStationIdFromParam, toStationSlug} from "@/lib/url-slugs";
import {useI18n} from '@/contexts/I18nContext';

const validStationTabs = new Set(['overview', 'uavs', 'inventory', 'activity']);

export function StationPanel() {
    const {can} = useAuth();
    const {t} = useI18n();
    const query = useCollection('stations');
    const [selected, setSelected] = useState<number>();
    const detail = useStation(selected);
    const [tab, setTab] = useState('overview');
    const [openCreate, setOpenCreate] = useState(false);
    const [form, setForm] = useState({code: '', name: '', address: '', latitude: '', longitude: ''});
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({code: '', name: '', address: '', latitude: '', longitude: ''});

    const create = useOperationMutation(operationsService.createStation, ['stations', 'dashboard', 'audit']);
    const update = useOperationMutation(
        ({id, data}: {id: number; data: {code: string; name: string; address?: string; latitude?: number; longitude?: number}}) =>
            operationsService.updateStation(id, data),
        ['stations', 'dashboard', 'audit']
    );
    const rows = query.data || [];

    const syncStationUrl = (stationId?: number, nextTab = 'overview') => {
        if (typeof window === 'undefined') return;
        if (!stationId) {
            window.history.replaceState(null, '', window.location.pathname);
            return;
        }
        const matched = rows.find(item => item.id === stationId) ?? (detail.data?.id === stationId ? detail.data : undefined);
        const slug = matched ? toStationSlug(matched) : String(stationId);
        const search = new URLSearchParams();
        search.set('station', slug);
        if (nextTab && nextTab !== 'overview') search.set('tab', nextTab);
        window.history.replaceState(null, '', `${window.location.pathname}?${search.toString()}`);
    };

    useEffect(() => {
        if (typeof window === 'undefined' || selected !== undefined) return;
        const params = new URLSearchParams(window.location.search);
        const resolved = resolveStationIdFromParam(params.get('station') || params.get('stationId'), rows);
        if (resolved) {
            setSelected(resolved);
            const requestedTab = params.get('tab');
            if (requestedTab && validStationTabs.has(requestedTab)) setTab(requestedTab);
        }
    }, [rows, selected]);

    useEffect(() => {
        if (detail.data) {
            setEditForm({
                code: detail.data.code,
                name: detail.data.name,
                address: detail.data.address || '',
                latitude: detail.data.latitude != null ? String(detail.data.latitude) : '',
                longitude: detail.data.longitude != null ? String(detail.data.longitude) : '',
            });
            setIsEditing(false);
        }
    }, [detail.data]);

    const columns = [
        {
            accessorKey: 'code',
            header: t('opsAssets.station.code'),
            cell: ({row}: { row: { original: Station } }) => <span className="font-semibold text-slate-900">{row.original.code}</span>
        },
        {accessorKey: 'name', header: t('opsAssets.station.name')},
        {
            accessorKey: 'address',
            header: t('opsAssets.station.address'),
            cell: ({row}: { row: { original: Station } }) => row.original.address || '—'
        },
        {
            accessorKey: 'coordinates',
            header: t('opsAssets.station.coordinates'),
            cell: ({row}: { row: { original: Station } }) =>
                row.original.latitude != null && row.original.longitude != null
                    ? `${row.original.latitude.toFixed(4)}, ${row.original.longitude.toFixed(4)}`
                    : '—'
        },
        {
            accessorKey: 'status',
            header: t('opsAssets.shared.status'),
            cell: ({row}: { row: { original: Station } }) => <StatusBadge status={row.original.status}/>
        },
        {
            id: 'actions',
            header: t('opsAssets.shared.actions'),
            enableSorting: false,
            enableHiding: false,
            cell: ({row}: { row: { original: Station } }) => <Button size="sm" variant="outline" onClick={() => {
                setSelected(row.original.id);
                setTab('overview');
                syncStationUrl(row.original.id, 'overview');
            }}>{t('opsAssets.shared.openDetail')}</Button>
        },
    ];

    return <div className="space-y-5">
        {can('STATION_MANAGE') && <div className="flex justify-end"><Button size="sm" leftIcon={<Plus size={15}/>}
                                                                            onClick={() => setOpenCreate(value => !value)}>{openCreate ? t('opsAssets.shared.closeForm') : t('opsAssets.station.create')}</Button>
        </div>}
        {openCreate &&
            <form className="space-y-4 rounded-panel border border-border bg-slate-50 p-4" onSubmit={async event => {
                event.preventDefault();
                try {
                    await create.mutateAsync({
                        code: form.code.trim(),
                        name: form.name.trim(),
                        address: form.address.trim() || undefined,
                        latitude: form.latitude.trim() ? Number(form.latitude) : undefined,
                        longitude: form.longitude.trim() ? Number(form.longitude) : undefined,
                    });
                    setForm({code: '', name: '', address: '', latitude: '', longitude: ''});
                    setOpenCreate(false);
                    await query.refetch();
                } catch { /* visible below */
                }
            }}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="station-code">{t('opsAssets.station.code')}<RequiredMark/></label><Input id="station-code"
                                                                                                    aria-required
                                                                                                    value={form.code}
                                                                                                    onChange={e => setForm({
                                                                                                        ...form,
                                                                                                        code: e.target.value
                                                                                                    })}/></div>
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="station-name">{t('opsAssets.station.name')}<RequiredMark/></label><Input id="station-name"
                                                                                                     aria-required
                                                                                                     value={form.name}
                                                                                                     onChange={e => setForm({
                                                                                                         ...form,
                                                                                                         name: e.target.value
                                                                                                     })}/></div>
                    <div className="col-span-full flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="station-address">{t('opsAssets.station.address')}<OptionalMark/></label><Input
                        id="station-address" value={form.address}
                        onChange={e => setForm({...form, address: e.target.value})}/></div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700" htmlFor="station-lat">{t('opsAssets.station.latitude')}<OptionalMark/></label>
                        <Input id="station-lat" type="number" step="any" min={-90} max={90} placeholder="e.g. 21.0285"
                               value={form.latitude} onChange={e => setForm({...form, latitude: e.target.value})}/>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700" htmlFor="station-lng">{t('opsAssets.station.longitude')}<OptionalMark/></label>
                        <Input id="station-lng" type="number" step="any" min={-180} max={180} placeholder="e.g. 105.8048"
                               value={form.longitude} onChange={e => setForm({...form, longitude: e.target.value})}/>
                    </div>
                </div>
                <div className="mt-6 flex flex-wrap justify-end"><Button size="sm" type="submit" isLoading={create.isPending}>{t('opsAssets.station.create')}</Button></div>
                <ErrorNotice error={create.error}/></form>}
        <QueryState query={query}><DataTable label={t('opsAssets.station.tableLabel')} data={rows} columns={columns} filters={[{
            column: 'status',
            label: t('opsAssets.shared.status'),
            options: options(rows.map(row => row.status))
        }]}/></QueryState>
        {selected && <Drawer title={t('opsAssets.station.detailTitle')} onClose={() => {
            setSelected(undefined);
            setIsEditing(false);
            syncStationUrl(undefined);
        }} wide><QueryState
            query={detail}>{detail.data && <><SectionHeading title={detail.data.name}
                                                             meta={detail.data.code + ' · ' + detail.data.status}/><Tabs
            items={[{id: 'overview', label: t('opsAssets.shared.overview')}, {id: 'uavs', label: t('opsAssets.station.tabs.uavs')}, {
                id: 'inventory',
                label: t('opsAssets.station.tabs.inventory')
            }, {id: 'activity', label: t('opsAssets.shared.activity')}]} value={tab} onChange={next => {
                setTab(next);
                setIsEditing(false);
                syncStationUrl(selected, next);
            }}/>{tab === 'overview' && (!isEditing ? (
                <div className="space-y-4">
                    <Metadata
                        items={[
                            [t('opsAssets.station.code'), detail.data.code],
                            [t('opsAssets.station.address'), detail.data.address || t('opsAssets.shared.notUpdated')],
                            [t('opsAssets.shared.status'), <StatusBadge key="detail-status" status={detail.data.status}/>],
                            [t('opsAssets.station.coordinates'), detail.data.latitude != null && detail.data.longitude != null ? `${detail.data.latitude}, ${detail.data.longitude}` : t('opsAssets.shared.notUpdated')]
                        ]}
                    />
                    {can('STATION_MANAGE') && (
                        <div className="flex justify-end pt-2">
                            <Button size="sm" variant="outline" leftIcon={<Edit3 size={14}/>} onClick={() => setIsEditing(true)}>
                                {t('opsAssets.station.edit')}
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <form className="space-y-4 rounded-panel border border-border bg-slate-50 p-4" onSubmit={async e => {
                    e.preventDefault();
                    if (!detail.data) return;
                    try {
                        await update.mutateAsync({
                            id: detail.data.id,
                            data: {
                                code: editForm.code.trim(),
                                name: editForm.name.trim(),
                                address: editForm.address.trim() || undefined,
                                latitude: editForm.latitude.trim() ? Number(editForm.latitude) : undefined,
                                longitude: editForm.longitude.trim() ? Number(editForm.longitude) : undefined,
                            }
                        });
                        setIsEditing(false);
                        await detail.refetch();
                        await query.refetch();
                    } catch { /* Error notice below */ }
                }}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700" htmlFor="edit-station-code">{t('opsAssets.station.code')}<RequiredMark/></label>
                            <Input id="edit-station-code" value={editForm.code} onChange={e => setEditForm({...editForm, code: e.target.value})}/>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700" htmlFor="edit-station-name">{t('opsAssets.station.name')}<RequiredMark/></label>
                            <Input id="edit-station-name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/>
                        </div>
                        <div className="col-span-full flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700" htmlFor="edit-station-address">{t('opsAssets.station.address')}<OptionalMark/></label>
                            <Input id="edit-station-address" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})}/>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700" htmlFor="edit-station-lat">{t('opsAssets.station.latitude')}<OptionalMark/></label>
                            <Input id="edit-station-lat" type="number" step="any" min={-90} max={90} value={editForm.latitude} onChange={e => setEditForm({...editForm, latitude: e.target.value})}/>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700" htmlFor="edit-station-lng">{t('opsAssets.station.longitude')}<OptionalMark/></label>
                            <Input id="edit-station-lng" type="number" step="any" min={-180} max={180} value={editForm.longitude} onChange={e => setEditForm({...editForm, longitude: e.target.value})}/>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button size="sm" variant="ghost" type="button" onClick={() => setIsEditing(false)}>
                            {t('opsAssets.station.cancel')}
                        </Button>
                        <Button size="sm" type="submit" isLoading={update.isPending}>
                            {t('opsAssets.station.save')}
                        </Button>
                    </div>
                    <ErrorNotice error={update.error}/>
                </form>
            ))}{tab === 'uavs' &&
            <p className="text-sm text-slate-600">{t('opsAssets.station.uavsNote')}</p>}{tab === 'inventory' &&
            <p className="text-sm text-slate-600">{t('opsAssets.station.inventoryNote')}</p>}{tab === 'activity' &&
            <p className="text-sm text-slate-600">{t('opsAssets.station.activityNote')}</p>}</>}</QueryState></Drawer>}
    </div>;
}
