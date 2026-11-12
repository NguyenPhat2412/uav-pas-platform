'use client';

import {useMemo, useState} from 'react';
import {Plus} from 'lucide-react';
import {Button, Card, CardContent, StatusBadge} from '@/components/ui';
import {useAuth} from '@/providers/AuthContext';
import {useStationMutations} from '@/hooks/station/useStations';
import {useCollection} from '@/hooks/useCollection';
import {DataTable, options} from '@/components/data/DataTable';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {
    canSubmitStation,
    emptyStationDraft,
    stationFieldErrors,
    toStationPayload,
} from '@/forms/station/station-form';
import type {Station} from '@/types/resources';
import {resolveStationIdFromParam, toStationSlug} from '@/lib/url-slugs';
import {useI18n} from '@/providers/I18nContext';
import {useStationsWeather} from '@/hooks/weather/useWeather';
import {StationWeatherCell} from '@/components/weather/StationWeatherCell';
import {StationFormDrawer, StationFormFields} from '@/components/station/StationFormDrawer';

const validStationTabs = new Set(['overview', 'uavs', 'inventory', 'activity']);

export function StationPanel() {
    const {can} = useAuth();
    const {t} = useI18n();
    const query = useCollection('stations');
    const weather = useStationsWeather();
    const weatherByStation = new Map((weather.data ?? []).map(item => [item.stationId, item]));
    const [selected, setSelected] = useState<number>();
    const [tab, setTab] = useState('overview');
    const [openCreate, setOpenCreate] = useState(false);
    const [form, setForm] = useState(emptyStationDraft);

    const {create} = useStationMutations();
    const createFieldErrors = stationFieldErrors(create.error);
    const rows = useMemo(() => query.data ?? [], [query.data]);

    const syncStationUrl = (stationId?: number, nextTab = 'overview') => {
        if (typeof window === 'undefined') return;
        if (!stationId) {
            window.history.replaceState(null, '', window.location.pathname);
            return;
        }
        const matched = rows.find(item => item.id === stationId);
        const slug = matched ? toStationSlug(matched) : String(stationId);
        const search = new URLSearchParams();
        search.set('station', slug);
        if (nextTab && nextTab !== 'overview') search.set('tab', nextTab);
        window.history.replaceState(null, '', `${window.location.pathname}?${search.toString()}`);
    };

    // Deep-link ?station=HN-01&tab=uavs opens that station once the list has loaded.
    const [deepLinkHandled, setDeepLinkHandled] = useState(false);
    if (!deepLinkHandled && rows.length > 0 && typeof window !== 'undefined') {
        setDeepLinkHandled(true);
        const params = new URLSearchParams(window.location.search);
        const resolved = selected === undefined
            ? resolveStationIdFromParam(params.get('station') || params.get('stationId'), rows)
            : undefined;
        if (resolved) {
            setSelected(resolved);
            const requestedTab = params.get('tab');
            if (requestedTab && validStationTabs.has(requestedTab)) setTab(requestedTab);
        }
    }

    const columns = [
        {
            accessorKey: 'code',
            header: t('opsAssets.station.code'),
            cell: ({row}: { row: { original: Station } }) => <span className="font-semibold text-slate-900">{row.original.code}</span>,
        },
        {accessorKey: 'name', header: t('opsAssets.station.name')},
        {
            accessorKey: 'address',
            header: t('opsAssets.station.address'),
            cell: ({row}: { row: { original: Station } }) => row.original.address || '—',
        },
        {
            accessorKey: 'coordinates',
            header: t('opsAssets.station.coordinates'),
            cell: ({row}: { row: { original: Station } }) =>
                row.original.latitude != null && row.original.longitude != null
                    ? `${row.original.latitude.toFixed(4)}, ${row.original.longitude.toFixed(4)}`
                    : '—',
        },
        {
            accessorKey: 'status',
            header: t('opsAssets.shared.status'),
            cell: ({row}: { row: { original: Station } }) => <StatusBadge status={row.original.status}/>,
        },
        {
            id: 'weather',
            header: t('weather.preflight.stationColumn'),
            enableSorting: false,
            cell: ({row}: { row: { original: Station } }) => (
                <StationWeatherCell summary={weatherByStation.get(row.original.id)} loading={weather.isPending && weather.fetchStatus !== 'idle'}/>
            ),
        },
        {
            id: 'actions',
            header: t('opsAssets.shared.actions'),
            enableSorting: false,
            enableHiding: false,
            cell: ({row}: { row: { original: Station } }) => (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        setSelected(row.original.id);
                        setTab('overview');
                        syncStationUrl(row.original.id, 'overview');
                    }}
                >
                    {t('opsAssets.shared.openDetail')}
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            {can('STATION_CREATE') && (
                <div className="flex justify-end">
                    <Button size="sm" leftIcon={<Plus size={15}/>} onClick={() => setOpenCreate(value => !value)}>
                        {openCreate ? t('opsAssets.shared.closeForm') : t('opsAssets.station.create')}
                    </Button>
                </div>
            )}

            {openCreate && (
                <Card className="border-border bg-slate-50">
                    <CardContent className="p-4">
                        <form
                            noValidate
                            className="space-y-4"
                            onSubmit={async event => {
                                event.preventDefault();
                                try {
                                    await create.mutateAsync(toStationPayload(form));
                                    setForm(emptyStationDraft());
                                    setOpenCreate(false);
                                    await query.refetch();
                                } catch { /* Shown below. */ }
                            }}
                        >
                            <StationFormFields idPrefix="station" draft={form} errors={createFieldErrors} onChange={setForm} showPlaceholders/>
                            <div className="mt-6 flex flex-wrap justify-end">
                                <Button size="sm" type="submit" disabled={!canSubmitStation(form)} isLoading={create.isPending}>
                                    {t('opsAssets.station.create')}
                                </Button>
                            </div>
                            {create.error && !createFieldErrors && <ErrorNotice error={create.error}/>}
                        </form>
                    </CardContent>
                </Card>
            )}

            <QueryState query={query}>
                <DataTable
                    label={t('opsAssets.station.tableLabel')}
                    data={rows}
                    columns={columns}
                    filters={[{column: 'status', label: t('opsAssets.shared.status'), options: options(rows.map(row => row.status))}]}
                />
            </QueryState>

            {selected && (
                <StationFormDrawer
                    key={selected}
                    stationId={selected}
                    tab={tab}
                    onTabChange={next => {
                        setTab(next);
                        syncStationUrl(selected, next);
                    }}
                    onClose={() => {
                        setSelected(undefined);
                        syncStationUrl(undefined);
                    }}
                    onListMutated={() => query.refetch()}
                    onDeleted={() => {
                        setSelected(undefined);
                        syncStationUrl(undefined);
                    }}
                />
            )}
        </div>
    );
}
