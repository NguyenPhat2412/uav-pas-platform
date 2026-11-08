'use client';

import React, {useId, useRef, useState} from 'react';
import {X} from 'lucide-react';
import {Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Switch, Textarea} from '@/components/ui';
import {
    AIRSPACE_GEOMETRY_TYPES,
    AIRSPACE_ZONE_TYPES,
    airspaceZoneDraftFromZone,
    airspaceZoneFieldErrors,
    canSubmitAirspaceZoneDraft,
    emptyAirspaceZoneDraft,
    toAirspaceZoneUpsertPayload,
    type AirspaceZoneDraft,
} from '@/forms/airspace/airspace-zone-form';
import {useCreateAirspaceZone, useUpdateAirspaceZone} from '@/hooks/airspace/useAirspace';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {useI18n} from '@/providers/I18nContext';
import type {AirspaceZone, AirspaceZoneType} from '@/types/airspace/airspace.types';

export interface AirspaceZoneFormCardProps {
    zone: AirspaceZone | null;
    onClose: () => void;
    onSaved: () => void;
    renderDraftMap: (
        draft: AirspaceZoneDraft,
        onChange: React.Dispatch<React.SetStateAction<AirspaceZoneDraft>>,
        editingZoneId: number | null,
    ) => React.ReactNode;
}

export function AirspaceZoneFormCard({zone, onClose, onSaved, renderDraftMap}: AirspaceZoneFormCardProps) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const [draft, setDraft] = useState<AirspaceZoneDraft>(() =>
        zone ? airspaceZoneDraftFromZone(zone) : emptyAirspaceZoneDraft(),
    );
    const createMutation = useCreateAirspaceZone({onSuccess: () => onSaved()});
    const updateMutation = useUpdateAirspaceZone({onSuccess: () => onSaved()});

    useDialogFocusTrap(dialogRef, true, onClose);

    const activeError = zone ? updateMutation.error : createMutation.error;
    const isPending = zone ? updateMutation.isPending : createMutation.isPending;
    const fieldErrors = airspaceZoneFieldErrors(activeError);
    const invertedWindow = Boolean(
        draft.effectiveFrom && draft.effectiveUntil && draft.effectiveUntil <= draft.effectiveFrom,
    );
    const patchDraft = (patch: Partial<AirspaceZoneDraft>) => setDraft(prev => ({...prev, ...patch}));

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmitAirspaceZoneDraft(draft) || isPending) return;
        const payload = toAirspaceZoneUpsertPayload(draft);
        if (zone) {
            updateMutation.mutate({id: zone.id, input: payload});
        } else {
            createMutation.mutate(payload);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
            onMouseDown={event => {
                if (event.target === event.currentTarget && !isPending) onClose();
            }}
        >
            <Card
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="w-[min(780px,calc(100vw-32px))] shadow-2xl focus:outline-none"
            >
                <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 px-5 py-4">
                    <CardTitle id={titleId} className="m-0 text-base font-bold text-slate-900">
                        {zone ? t('airspace.admin.editTitle') : t('airspace.admin.createTitle')}
                    </CardTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={t('common.cancel')}
                        disabled={isPending}
                        onClick={onClose}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                    >
                        <X size={16} aria-hidden="true" />
                    </Button>
                </CardHeader>
                <CardContent className="max-h-[85vh] overflow-y-auto px-5 py-4">
                    <form noValidate className="space-y-4" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                            <Input
                                label={t('airspace.admin.form.code')}
                                required
                                maxLength={40}
                                autoFocus
                                value={draft.code}
                                error={fieldErrors?.code}
                                placeholder="VN-HN-NFZ-01"
                                onChange={e => patchDraft({code: e.target.value})}
                                className="h-10 font-mono text-sm uppercase"
                            />
                            <Select
                                label={t('airspace.admin.form.zoneType')}
                                required
                                value={draft.zoneType}
                                onChange={e => patchDraft({zoneType: e.target.value as AirspaceZoneType})}
                                className="h-10"
                            >
                                {AIRSPACE_ZONE_TYPES.map(zt => (
                                    <option key={zt} value={zt}>{t(`airspace.zoneType.${zt}`)}</option>
                                ))}
                            </Select>
                            <div className="sm:col-span-2">
                                <Input
                                    label={t('airspace.admin.form.name')}
                                    required
                                    maxLength={180}
                                    value={draft.name}
                                    error={fieldErrors?.name}
                                    placeholder={t('airspace.admin.form.namePlaceholder')}
                                    onChange={e => patchDraft({name: e.target.value})}
                                    className="h-10 text-sm"
                                />
                            </div>
                            <Input
                                label={t('airspace.admin.form.authority')}
                                required
                                maxLength={180}
                                value={draft.authority}
                                error={fieldErrors?.authority}
                                placeholder={t('airspace.admin.form.authorityPlaceholder')}
                                onChange={e => patchDraft({authority: e.target.value})}
                                className="h-10 text-sm"
                            />
                            <Input
                                type="number"
                                min={0}
                                max={10000}
                                step={10}
                                label={t('airspace.admin.form.maxAltitudeAglM')}
                                optional
                                value={draft.maxAltitudeAglM}
                                error={fieldErrors?.maxAltitudeAglM}
                                placeholder={t('airspace.admin.form.ceilingPlaceholder')}
                                onChange={e => patchDraft({maxAltitudeAglM: e.target.value})}
                                className="h-10 text-sm"
                            />
                            <div className="sm:col-span-2">
                                <Select
                                    label={t('airspace.admin.form.geometryType')}
                                    required
                                    value={draft.geometryType}
                                    onChange={e => patchDraft({geometryType: e.target.value as AirspaceZoneDraft['geometryType']})}
                                    className="h-10"
                                >
                                    {AIRSPACE_GEOMETRY_TYPES.map(gt => (
                                        <option key={gt} value={gt}>{t(`airspace.geometry.${gt}`)}</option>
                                    ))}
                                </Select>
                            </div>

                            {renderDraftMap(draft, setDraft, zone?.id ?? null)}

                            {draft.geometryType === 'CIRCLE' ? (
                                <>
                                    <Input
                                        type="number"
                                        min={-90}
                                        max={90}
                                        step="any"
                                        label={t('airspace.admin.form.centerLat')}
                                        required
                                        value={draft.centerLat}
                                        error={fieldErrors?.centerLat}
                                        onChange={e => patchDraft({centerLat: e.target.value})}
                                        className="h-10 text-sm"
                                    />
                                    <Input
                                        type="number"
                                        min={-180}
                                        max={180}
                                        step="any"
                                        label={t('airspace.admin.form.centerLng')}
                                        required
                                        value={draft.centerLng}
                                        error={fieldErrors?.centerLng}
                                        onChange={e => patchDraft({centerLng: e.target.value})}
                                        className="h-10 text-sm"
                                    />
                                    <div className="sm:col-span-2">
                                        <Input
                                            type="number"
                                            min={10}
                                            max={100000}
                                            step={50}
                                            label={t('airspace.admin.form.radiusMeters')}
                                            required
                                            value={draft.radiusMeters}
                                            error={fieldErrors?.radiusMeters}
                                            onChange={e => patchDraft({radiusMeters: e.target.value})}
                                            className="h-10 text-sm"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="sm:col-span-2">
                                    <Textarea
                                        rows={4}
                                        label={t('airspace.admin.form.vertices')}
                                        required
                                        value={draft.verticesText}
                                        error={fieldErrors?.vertices || fieldErrors?.verticesText}
                                        helperText={t('airspace.admin.form.verticesHint')}
                                        placeholder={'21.0325, 105.8310\n21.0350, 105.8390\n21.0280, 105.8410'}
                                        onChange={e => patchDraft({verticesText: e.target.value})}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            )}

                            <Input
                                type="datetime-local"
                                label={t('capabilities.notam.effectiveFrom')}
                                optional
                                value={draft.effectiveFrom}
                                error={fieldErrors?.effectiveFrom}
                                onChange={e => patchDraft({effectiveFrom: e.target.value})}
                                className="h-10 text-sm"
                            />
                            <Input
                                type="datetime-local"
                                min={draft.effectiveFrom || undefined}
                                label={t('capabilities.notam.effectiveUntil')}
                                optional
                                value={draft.effectiveUntil}
                                error={fieldErrors?.effectiveUntil}
                                aria-invalid={Boolean(fieldErrors?.effectiveUntil || invertedWindow) || undefined}
                                onChange={e => patchDraft({effectiveUntil: e.target.value})}
                                className="h-10 text-sm"
                            />
                            <p className="m-0 text-xs text-slate-500 sm:col-span-2">{t('capabilities.notam.hint')}</p>
                            <div className="sm:col-span-2">
                                <Textarea
                                    rows={2}
                                    maxLength={1000}
                                    label={t('airspace.admin.form.description')}
                                    optional
                                    value={draft.description}
                                    error={fieldErrors?.description}
                                    placeholder={t('airspace.admin.form.descriptionPlaceholder')}
                                    onChange={e => patchDraft({description: e.target.value})}
                                />
                            </div>
                        </div>

                        <Switch
                            checked={draft.active}
                            onCheckedChange={checked => patchDraft({active: checked})}
                            label={t('airspace.admin.form.activeLabel')}
                        />

                        {activeError && !fieldErrors && <Alert variant="error">{activeError.message}</Alert>}

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" isLoading={isPending} disabled={isPending || !canSubmitAirspaceZoneDraft(draft)}>
                                {zone ? t('airspace.admin.actions.saveChanges') : t('airspace.admin.create')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
