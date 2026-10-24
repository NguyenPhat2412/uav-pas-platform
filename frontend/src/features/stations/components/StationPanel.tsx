'use client';
import {useEffect, useState} from 'react';
import {Plus} from 'lucide-react';
import {Button, Input, StatusBadge} from '@/components/ui';
import {useAuth} from '@/contexts/AuthContext';
import {useOperationMutation, useStation} from "@/hooks/useOperations";
import {useCollection} from "@/hooks/useCollections";
import {operationsService} from "@/lib/api/resources";
import {DataTable, options} from '@/components/data/DataTable';
import {Drawer, Metadata, Tabs} from '@/components/data/Drawer';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {SectionHeading} from '@/components/layout/PageHeader';
import type {Station} from "@/types/resources";
import {RequiredMark} from "@/components/shared/RequiredMark";
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
    const [form, setForm] = useState({code: '', name: '', address: ''});
    const create = useOperationMutation(operationsService.createStation, ['stations', 'dashboard', 'audit']);
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
            <form className="space-y-4 rounded-lg border border-border bg-slate-50 p-4" onSubmit={async event => {
                event.preventDefault();
                try {
                    await create.mutateAsync(form);
                    setForm({code: '', name: '', address: ''});
                    setOpenCreate(false);
                    await query.refetch();
                } catch { /* visible below */
                }
            }}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="station-code">{t('opsAssets.station.code')}<RequiredMark/></label><Input id="station-code"
                                                                                                    required
                                                                                                    maxLength={40}
                                                                                                    value={form.code}
                                                                                                    onChange={e => setForm({
                                                                                                        ...form,
                                                                                                        code: e.target.value
                                                                                                    })}/></div>
                    <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="station-name">{t('opsAssets.station.name')}<RequiredMark/></label><Input id="station-name"
                                                                                                     required
                                                                                                     maxLength={120}
                                                                                                     value={form.name}
                                                                                                     onChange={e => setForm({
                                                                                                         ...form,
                                                                                                         name: e.target.value
                                                                                                     })}/></div>
                    <div className="col-span-full flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-700" htmlFor="station-address">{t('opsAssets.station.address')}</label><Input
                        id="station-address" maxLength={255} value={form.address}
                        onChange={e => setForm({...form, address: e.target.value})}/></div>
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
            syncStationUrl(undefined);
        }} wide><QueryState
            query={detail}>{detail.data && <><SectionHeading title={detail.data.name}
                                                             meta={detail.data.code + ' · ' + detail.data.status}/><Tabs
            items={[{id: 'overview', label: t('opsAssets.shared.overview')}, {id: 'uavs', label: t('opsAssets.station.tabs.uavs')}, {
                id: 'inventory',
                label: t('opsAssets.station.tabs.inventory')
            }, {id: 'activity', label: t('opsAssets.shared.activity')}]} value={tab} onChange={next => {
                setTab(next);
                syncStationUrl(selected, next);
            }}/>{tab === 'overview' && <Metadata
            items={[[t('opsAssets.station.code'), detail.data.code], [t('opsAssets.station.address'), detail.data.address || t('opsAssets.shared.notUpdated')], [t('opsAssets.shared.status'),
                <StatusBadge key="detail-status"
                             status={detail.data.status}/>], [t('opsAssets.station.coordinates'), detail.data.latitude && detail.data.longitude ? String(detail.data.latitude) + ', ' + String(detail.data.longitude) : t('opsAssets.shared.notUpdated')]]}/>}{tab === 'uavs' &&
            <p className="text-sm text-slate-600">{t('opsAssets.station.uavsNote')}</p>}{tab === 'inventory' &&
            <p className="text-sm text-slate-600">{t('opsAssets.station.inventoryNote')}</p>}{tab === 'activity' &&
            <p className="text-sm text-slate-600">{t('opsAssets.station.activityNote')}</p>}</>}</QueryState></Drawer>}
    </div>;
}
