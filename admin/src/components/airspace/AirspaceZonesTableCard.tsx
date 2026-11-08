'use client';

import React from 'react';
import {Clock, PencilLine, Power, Search, Trash2} from 'lucide-react';
import {DataTable} from '@/components/data/ResourceState';
import {EmptyState} from '@/components/data/WorkspaceState';
import {Badge, Button, Card, CardContent, Input, StatusBadge, Switch} from '@/components/ui';
import {AIRSPACE_ZONE_TYPE_TONE} from '@/components/airspace/MissionAirspaceAdvisor';
import {AIRSPACE_ZONE_TYPES} from '@/forms/airspace/airspace-zone-form';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';
import type {AirspaceZone, AirspaceZoneType} from '@/types/airspace/airspace.types';

export interface AirspaceZonesTableCardProps {
    zones: readonly AirspaceZone[];
    typeFilter: 'ALL' | AirspaceZoneType;
    onTypeFilterChange: (next: 'ALL' | AirspaceZoneType) => void;
    search: string;
    onSearchChange: (next: string) => void;
    showInactive: boolean;
    onShowInactiveChange: (next: boolean) => void;
    togglingId: number | null;
    onToggleActive: (zone: AirspaceZone) => void;
    onEditZone: (zone: AirspaceZone) => void;
    onDeleteZone: (zone: AirspaceZone) => void;
}

const FILTER_TABS: readonly ('ALL' | AirspaceZoneType)[] = ['ALL', ...AIRSPACE_ZONE_TYPES];

export function AirspaceZonesTableCard({
    zones,
    typeFilter,
    onTypeFilterChange,
    search,
    onSearchChange,
    showInactive,
    onShowInactiveChange,
    togglingId,
    onToggleActive,
    onEditZone,
    onDeleteZone,
}: AirspaceZonesTableCardProps) {
    const {t, formatNumber, formatDate} = useI18n();

    const headers = [
        t('airspace.admin.columns.zone'),
        t('airspace.admin.columns.type'),
        t('airspace.admin.columns.geometry'),
        t('airspace.admin.columns.ceiling'),
        t('airspace.admin.columns.authority'),
        t('airspace.admin.columns.status'),
        t('airspace.admin.columns.actions'),
    ];

    const rows = zones.map(zone => [
        <div key={`zone-${zone.id}`} className={cn(!zone.active && 'opacity-70')}>
            <div className="font-mono text-xs font-bold text-slate-600">{zone.code}</div>
            <div className="font-semibold text-slate-900">{zone.name}</div>
            {(zone.effectiveFrom || zone.effectiveUntil) && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge
                        variant="warning"
                        size="sm"
                        icon={<Clock size={11} className="shrink-0" aria-hidden="true" />}
                        className="border-amber-200 bg-amber-50 text-amber-800 normal-case tracking-normal"
                    >
                        {t('capabilities.notam.scheduledBadge')}
                    </Badge>
                    <span className="text-[11px] font-medium tabular-nums text-slate-600">
                        {t('capabilities.notam.windowSummary', {
                            from: zone.effectiveFrom ? formatDate(zone.effectiveFrom) : '—',
                            until: zone.effectiveUntil ? formatDate(zone.effectiveUntil) : '—',
                        })}
                    </span>
                </div>
            )}
            {zone.description && (
                <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">{zone.description}</div>
            )}
        </div>,
        <Badge
            key={`type-${zone.id}`}
            className={cn('normal-case tracking-normal text-xs', AIRSPACE_ZONE_TYPE_TONE[zone.zoneType])}
        >
            {t(`airspace.zoneType.${zone.zoneType}`)}
        </Badge>,
        <div key={`geo-${zone.id}`} className="tabular-nums">
            <div className="font-semibold text-slate-800">
                {zone.geometryType === 'CIRCLE'
                    ? `${t('airspace.geometry.CIRCLE')} · ${formatNumber(zone.radiusMeters ?? 0)} m`
                    : `${t('airspace.geometry.POLYGON')} · ${zone.vertices?.length ?? 0} ${t('airspace.admin.verticesUnit')}`}
            </div>
            <div className="font-mono text-xs text-slate-500">
                {zone.centerLat.toFixed(5)}, {zone.centerLng.toFixed(5)}
            </div>
        </div>,
        <span key={`ceil-${zone.id}`} className="tabular-nums">
            {zone.maxAltitudeAglM != null
                ? `${formatNumber(zone.maxAltitudeAglM)} m AGL`
                : t('airspace.tooltip.ceilingUnlimited')}
        </span>,
        <span key={`auth-${zone.id}`}>{zone.authority}</span>,
        <StatusBadge
            key={`status-${zone.id}`}
            status={zone.active ? 'ACTIVE' : 'INACTIVE'}
            label={zone.active ? t('airspace.admin.status.active') : t('airspace.admin.status.inactive')}
        />,
        <div key={`actions-${zone.id}`} className="flex flex-wrap items-center justify-end gap-1.5">
            <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={togglingId === zone.id}
                disabled={togglingId !== null}
                leftIcon={<Power size={13} />}
                onClick={() => onToggleActive(zone)}
            >
                {zone.active ? t('airspace.admin.actions.deactivate') : t('airspace.admin.actions.activate')}
            </Button>
            <Button
                type="button"
                size="sm"
                variant="outline"
                leftIcon={<PencilLine size={13} />}
                onClick={() => onEditZone(zone)}
            >
                {t('airspace.admin.actions.edit')}
            </Button>
            <Button
                type="button"
                size="sm"
                variant="danger"
                leftIcon={<Trash2 size={13} />}
                onClick={() => onDeleteZone(zone)}
            >
                {t('airspace.admin.actions.delete')}
            </Button>
        </div>,
    ]);

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3.5">
                    <div
                        className="flex flex-wrap items-center gap-1.5"
                        role="group"
                        aria-label={t('airspace.admin.filterType')}
                    >
                        {FILTER_TABS.map(option => (
                            <Button
                                key={option}
                                type="button"
                                size="sm"
                                variant={typeFilter === option ? 'primary' : 'outline'}
                                onClick={() => onTypeFilterChange(option)}
                                className="text-xs font-bold"
                            >
                                {option === 'ALL' ? t('airspace.admin.filterAll') : t(`airspace.zoneType.${option}`)}
                            </Button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-56">
                            <Input
                                type="search"
                                value={search}
                                onChange={e => onSearchChange(e.target.value)}
                                placeholder={t('airspace.admin.searchPlaceholder')}
                                aria-label={t('airspace.admin.searchPlaceholder')}
                                leftIcon={<Search size={14} aria-hidden="true" />}
                                className="h-9 text-xs"
                            />
                        </div>
                        <Switch
                            checked={showInactive}
                            onCheckedChange={onShowInactiveChange}
                            label={t('airspace.admin.showInactive')}
                        />
                    </div>
                </CardContent>
            </Card>

            {zones.length === 0 ? (
                <Card>
                    <CardContent className="p-0">
                        <EmptyState title={t('airspace.admin.empty')} />
                    </CardContent>
                </Card>
            ) : (
                <DataTable headers={headers} rows={rows} />
            )}
        </div>
    );
}
