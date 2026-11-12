'use client';

import React, {useMemo, useState} from 'react';
import {AlertTriangle, Layers, Plus, ShieldAlert, ShieldBan} from 'lucide-react';
import {AdminPage} from '@/components/layout/AdminPage';
import {ResourceState} from '@/components/data/ResourceState';
import {Alert, Button, Card, CardContent, ConfirmDialog, KpiCard, MetricStrip} from '@/components/ui';
import {AirspaceDraftMap, AirspaceOverviewMap} from '@/components/airspace/AirspaceMapCanvas';
import {AirspaceZoneFormCard} from '@/components/airspace/AirspaceZoneFormCard';
import {AirspaceZonesTableCard} from '@/components/airspace/AirspaceZonesTableCard';
import {toAirspaceZoneTogglePayload} from '@/forms/airspace/airspace-zone-form';
import {useAirspaceZones, useDeleteAirspaceZone, useUpdateAirspaceZone} from '@/hooks/airspace/useAirspace';
import {useI18n} from '@/providers/I18nContext';
import type {AirspaceZone, AirspaceZoneType} from '@/types/airspace/airspace.types';

function AdminAirspaceContent() {
    const {t} = useI18n();
    const query = useAirspaceZones(false);
    const [typeFilter, setTypeFilter] = useState<'ALL' | AirspaceZoneType>('ALL');
    const [showInactive, setShowInactive] = useState(true);
    const [search, setSearch] = useState('');
    const [editingZone, setEditingZone] = useState<AirspaceZone | 'create' | null>(null);
    const [deletingZone, setDeletingZone] = useState<AirspaceZone | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState('');

    const toggleMutation = useUpdateAirspaceZone({
        onSettled: () => setTogglingId(null),
    });
    const deleteMutation = useDeleteAirspaceZone();

    const allZones = useMemo(() => query.data ?? [], [query.data]);

    const filteredZones = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return allZones.filter(zone => {
            if (typeFilter !== 'ALL' && zone.zoneType !== typeFilter) return false;
            if (!showInactive && !zone.active) return false;
            if (!keyword) return true;
            return (
                zone.code.toLowerCase().includes(keyword) ||
                zone.name.toLowerCase().includes(keyword) ||
                zone.authority.toLowerCase().includes(keyword)
            );
        });
    }, [allZones, typeFilter, showInactive, search]);

    const counts = useMemo(
        () => ({
            total: allZones.length,
            prohibited: allZones.filter(z => z.zoneType === 'PROHIBITED').length,
            restricted: allZones.filter(z => z.zoneType === 'RESTRICTED').length,
            warning: allZones.filter(z => z.zoneType === 'WARNING').length,
        }),
        [allZones],
    );

    const handleToggleActive = async (zone: AirspaceZone) => {
        setActionError('');
        setTogglingId(zone.id);
        try {
            await toggleMutation.mutateAsync({
                id: zone.id,
                input: toAirspaceZoneTogglePayload(zone, !zone.active),
            });
        } catch (err) {
            setActionError(err instanceof Error && err.message ? err.message : t('airspace.admin.errors.saveFailed'));
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingZone || deleteMutation.isPending) return;
        setActionError('');
        try {
            await deleteMutation.mutateAsync(deletingZone.id);
            setDeletingZone(null);
        } catch (err) {
            setDeletingZone(null);
            setActionError(err instanceof Error && err.message ? err.message : t('airspace.admin.errors.saveFailed'));
        }
    };

    return (
        <div className="space-y-5 pb-12">
            <Card>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="m-0 text-sm text-slate-700">{t('airspace.admin.intro')}</p>
                        <p className="m-0 mt-1 text-xs text-slate-500">
                            {t('airspace.admin.summaryCounts', {
                                total: counts.total,
                                prohibited: counts.prohibited,
                                restricted: counts.restricted,
                                warning: counts.warning,
                            })}
                        </p>
                    </div>
                    <Button onClick={() => setEditingZone('create')} leftIcon={<Plus size={16} />}>
                        {t('airspace.admin.create')}
                    </Button>
                </CardContent>
            </Card>

            <MetricStrip>
                <KpiCard label={t('airspace.admin.filterAll')} value={counts.total} icon={<Layers size={16} />} tone="slate" />
                <KpiCard label={t('airspace.zoneType.PROHIBITED')} value={counts.prohibited} icon={<ShieldBan size={16} />} tone="red" />
                <KpiCard label={t('airspace.zoneType.RESTRICTED')} value={counts.restricted} icon={<ShieldAlert size={16} />} tone="amber" />
                <KpiCard label={t('airspace.zoneType.WARNING')} value={counts.warning} icon={<AlertTriangle size={16} />} tone="blue" />
            </MetricStrip>

            {actionError && <Alert variant="error">{actionError}</Alert>}

            <ResourceState query={query}>
                <div className="space-y-4">
                    <AirspaceOverviewMap
                        zones={filteredZones}
                        onSelectZone={zone => setEditingZone(zone)}
                    />
                    <AirspaceZonesTableCard
                        zones={filteredZones}
                        typeFilter={typeFilter}
                        onTypeFilterChange={setTypeFilter}
                        search={search}
                        onSearchChange={setSearch}
                        showInactive={showInactive}
                        onShowInactiveChange={setShowInactive}
                        togglingId={togglingId}
                        onToggleActive={zone => void handleToggleActive(zone)}
                        onEditZone={zone => setEditingZone(zone)}
                        onDeleteZone={zone => setDeletingZone(zone)}
                    />
                </div>
            </ResourceState>

            {editingZone && (
                <AirspaceZoneFormCard
                    zone={editingZone === 'create' ? null : editingZone}
                    onClose={() => setEditingZone(null)}
                    onSaved={() => setEditingZone(null)}
                    renderDraftMap={(draft, onChange, editingZoneId) => (
                        <AirspaceDraftMap
                            draft={draft}
                            existingZones={allZones}
                            editingZoneId={editingZoneId}
                            onChange={onChange}
                        />
                    )}
                />
            )}

            <ConfirmDialog
                open={deletingZone !== null}
                variant="danger"
                title={t('airspace.admin.deleteTitle')}
                description={
                    deletingZone
                        ? t('airspace.admin.deleteConfirm', {
                              code: deletingZone.code,
                              name: deletingZone.name,
                          })
                        : ''
                }
                confirmLabel={t('airspace.admin.actions.delete')}
                cancelLabel={t('common.cancel')}
                onCancel={() => {
                    if (!deleteMutation.isPending) setDeletingZone(null);
                }}
                onConfirm={() => void handleConfirmDelete()}
            />
        </div>
    );
}

export default function AdminAirspacePanel() {
    return (
        <AdminPage title="admin.pages.airspace.title" permission="USER_MANAGE" activeResource="airspace">
            <AdminAirspaceContent />
        </AdminPage>
    );
}
