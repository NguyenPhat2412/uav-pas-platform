'use client';

import {useState} from 'react';
import {Edit3, Trash2} from 'lucide-react';
import {Alert, Button, Card, CardContent, FormField, Input, Select, StatusBadge} from '@/components/ui';
import {useAuth} from '@/providers/AuthContext';
import {useStation, useStationMutations} from '@/hooks/station/useStations';
import {Drawer, Metadata, Tabs} from '@/components/data/Drawer';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {SectionHeading} from '@/components/layout/PageHeader';
import {
    canSubmitStation,
    emptyStationDraft,
    stationFieldErrors,
    toStationDraft,
    toStationPayload,
} from '@/forms/station/station-form';
import {displayLabel} from '@/lib/presentation';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';

export type StationDraft = ReturnType<typeof emptyStationDraft>;
export type StationErrors = ReturnType<typeof stationFieldErrors>;

export function StationFormFields({
    idPrefix,
    draft,
    errors,
    onChange,
    showPlaceholders = false,
}: {
    idPrefix: string;
    draft: StationDraft;
    errors: StationErrors;
    onChange: (next: StationDraft) => void;
    showPlaceholders?: boolean;
}) {
    const {t} = useI18n();
    const fieldClass = (err?: string) => cn('h-11 px-3 text-sm', err && 'border-danger');

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id={`${idPrefix}-code`} label={t('opsAssets.station.code')} required error={errors?.code}>
                <Input
                    id={`${idPrefix}-code`}
                    required
                    aria-required
                    aria-invalid={Boolean(errors?.code)}
                    value={draft.code}
                    onChange={e => onChange({...draft, code: e.target.value})}
                    className={fieldClass(errors?.code)}
                />
            </FormField>
            <FormField id={`${idPrefix}-name`} label={t('opsAssets.station.name')} required error={errors?.name}>
                <Input
                    id={`${idPrefix}-name`}
                    required
                    aria-required
                    aria-invalid={Boolean(errors?.name)}
                    value={draft.name}
                    onChange={e => onChange({...draft, name: e.target.value})}
                    className={fieldClass(errors?.name)}
                />
            </FormField>
            <FormField id={`${idPrefix}-address`} label={t('opsAssets.station.address')} optional error={errors?.address} className="col-span-full">
                <Input
                    id={`${idPrefix}-address`}
                    aria-invalid={Boolean(errors?.address)}
                    value={draft.address}
                    onChange={e => onChange({...draft, address: e.target.value})}
                    className={fieldClass(errors?.address)}
                />
            </FormField>
            <FormField id={`${idPrefix}-description`} label={t('opsAssets.station.description')} optional error={errors?.description} className="col-span-full">
                <Input
                    id={`${idPrefix}-description`}
                    maxLength={500}
                    aria-invalid={Boolean(errors?.description)}
                    value={draft.description}
                    onChange={e => onChange({...draft, description: e.target.value})}
                    className={fieldClass(errors?.description)}
                />
            </FormField>
            <FormField id={`${idPrefix}-lat`} label={t('opsAssets.station.latitude')} optional error={errors?.latitude}>
                <Input
                    id={`${idPrefix}-lat`}
                    type="number"
                    step="any"
                    placeholder={showPlaceholders ? 'e.g. 21.0285' : undefined}
                    aria-invalid={Boolean(errors?.latitude)}
                    value={draft.latitude}
                    onChange={e => onChange({...draft, latitude: e.target.value})}
                    className={fieldClass(errors?.latitude)}
                />
            </FormField>
            <FormField id={`${idPrefix}-lng`} label={t('opsAssets.station.longitude')} optional error={errors?.longitude}>
                <Input
                    id={`${idPrefix}-lng`}
                    type="number"
                    step="any"
                    placeholder={showPlaceholders ? 'e.g. 105.8048' : undefined}
                    aria-invalid={Boolean(errors?.longitude)}
                    value={draft.longitude}
                    onChange={e => onChange({...draft, longitude: e.target.value})}
                    className={fieldClass(errors?.longitude)}
                />
            </FormField>
        </div>
    );
}

export interface StationFormDrawerProps {
    stationId: number;
    tab: string;
    onTabChange: (nextTab: string) => void;
    onClose: () => void;
    onListMutated: () => Promise<unknown>;
    onDeleted: () => void;
}

export function StationFormDrawer({
    stationId,
    tab,
    onTabChange,
    onClose,
    onListMutated,
    onDeleted,
}: StationFormDrawerProps) {
    const {can} = useAuth();
    const {t} = useI18n();
    const detail = useStation(stationId);
    const {update, setStatus, remove} = useStationMutations();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<StationDraft>(emptyStationDraft);
    const [removing, setRemoving] = useState(false);
    const [notice, setNotice] = useState('');
    const updateFieldErrors = stationFieldErrors(update.error);

    return (
        <Drawer title={t('opsAssets.station.detailTitle')} onClose={onClose} wide>
            <QueryState query={detail}>
                {detail.data && (
                    <>
                        <SectionHeading title={detail.data.name} meta={`${detail.data.code} · ${detail.data.status}`}/>
                        <Tabs
                            items={[
                                {id: 'overview', label: t('opsAssets.shared.overview')},
                                {id: 'uavs', label: t('opsAssets.station.tabs.uavs')},
                                {id: 'inventory', label: t('opsAssets.station.tabs.inventory')},
                                {id: 'activity', label: t('opsAssets.shared.activity')},
                            ]}
                            value={tab}
                            onChange={next => {
                                setIsEditing(false);
                                onTabChange(next);
                            }}
                        />
                        {tab === 'overview' && (!isEditing ? (
                            <div className="space-y-4">
                                <Metadata
                                    items={[
                                        [t('opsAssets.station.code'), detail.data.code],
                                        [t('opsAssets.station.address'), detail.data.address || t('opsAssets.shared.notUpdated')],
                                        [t('opsAssets.shared.status'), <StatusBadge key="detail-status" status={detail.data.status}/>],
                                        [t('opsAssets.station.coordinates'), detail.data.latitude != null && detail.data.longitude != null ? `${detail.data.latitude}, ${detail.data.longitude}` : t('opsAssets.shared.notUpdated')],
                                        [t('opsAssets.station.description'), detail.data.description || t('opsAssets.shared.notUpdated')],
                                    ]}
                                />
                                {can('STATION_STATUS_UPDATE') && (
                                    <FormField id="station-status-select" label={t('opsAssets.station.statusLabel')} optional={false} className="max-w-xs">
                                        <Select
                                            id="station-status-select"
                                            value={detail.data.status}
                                            disabled={setStatus.isPending}
                                            onChange={async event => {
                                                setNotice('');
                                                try {
                                                    await setStatus.mutateAsync({
                                                        id: detail.data!.id,
                                                        status: event.target.value as 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE',
                                                    });
                                                    await detail.refetch();
                                                } catch { /* Error notice below. */ }
                                            }}
                                        >
                                            {(['ACTIVE', 'INACTIVE', 'MAINTENANCE'] as const).map(status => (
                                                <option key={status} value={status}>{displayLabel(status)}</option>
                                            ))}
                                        </Select>
                                    </FormField>
                                )}
                                {setStatus.error && <ErrorNotice error={setStatus.error}/>}
                                {notice && <Alert variant="info">{t(notice)}</Alert>}
                                <div className="flex flex-wrap justify-end gap-2 pt-2">
                                    {can('STATION_STATUS_UPDATE') && (
                                        <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14}/>} onClick={() => { remove.reset(); setRemoving(true); }}>
                                            {t('opsAssets.station.remove')}
                                        </Button>
                                    )}
                                    {can('STATION_UPDATE') && (
                                        <Button size="sm" variant="outline" leftIcon={<Edit3 size={14}/>} onClick={() => { setEditForm(toStationDraft(detail.data!)); setIsEditing(true); }}>
                                            {t('opsAssets.station.edit')}
                                        </Button>
                                    )}
                                </div>
                                {removing && (
                                    <Card role="alertdialog" aria-label={t('opsAssets.station.removeTitle')} className="border-border bg-slate-50">
                                        <CardContent className="space-y-3 p-4">
                                            <p className="text-sm font-semibold text-slate-800">{t('opsAssets.station.removeTitle')}</p>
                                            <p className="text-sm text-slate-600">{t('opsAssets.station.removeNote')}</p>
                                            {remove.error && <ErrorNotice error={remove.error}/>}
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => setRemoving(false)}>{t('opsAssets.station.cancel')}</Button>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    isLoading={remove.isPending}
                                                    onClick={async () => {
                                                        try {
                                                            const kept = await remove.mutateAsync(detail.data!.id);
                                                            setRemoving(false);
                                                            if (kept) {
                                                                setNotice('opsAssets.station.deactivated');
                                                                await detail.refetch();
                                                            } else {
                                                                onDeleted();
                                                            }
                                                            await onListMutated();
                                                        } catch { /* Error notice above. */ }
                                                    }}
                                                >
                                                    {t('opsAssets.station.confirmRemove')}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            <Card className="border-border bg-slate-50">
                                <CardContent className="p-4">
                                    <form
                                        noValidate
                                        className="space-y-4"
                                        onSubmit={async e => {
                                            e.preventDefault();
                                            if (!detail.data) return;
                                            try {
                                                await update.mutateAsync({id: detail.data.id, data: toStationPayload(editForm)});
                                                setIsEditing(false);
                                                await detail.refetch();
                                                await onListMutated();
                                            } catch { /* Error notice below. */ }
                                        }}
                                    >
                                        <StationFormFields idPrefix="edit-station" draft={editForm} errors={updateFieldErrors} onChange={setEditForm}/>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button size="sm" variant="ghost" type="button" onClick={() => setIsEditing(false)}>{t('opsAssets.station.cancel')}</Button>
                                            <Button size="sm" type="submit" disabled={!canSubmitStation(editForm)} isLoading={update.isPending}>{t('opsAssets.station.save')}</Button>
                                        </div>
                                        {update.error && !updateFieldErrors && <ErrorNotice error={update.error}/>}
                                    </form>
                                </CardContent>
                            </Card>
                        ))}
                        {tab === 'uavs' && <p className="text-sm text-slate-600">{t('opsAssets.station.uavsNote')}</p>}
                        {tab === 'inventory' && <p className="text-sm text-slate-600">{t('opsAssets.station.inventoryNote')}</p>}
                        {tab === 'activity' && <p className="text-sm text-slate-600">{t('opsAssets.station.activityNote')}</p>}
                    </>
                )}
            </QueryState>
        </Drawer>
    );
}
