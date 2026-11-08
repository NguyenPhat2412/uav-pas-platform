'use client';

import {useState} from 'react';
import {Bookmark, BookmarkPlus, MapPin, Trash2} from 'lucide-react';
import {
    Alert,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    ConfirmDialog,
    FormField,
    Input,
} from '@/components/ui';
import {flightPlanComplete} from '@/forms/mission/mission-form';
import {useMissionActions, useSavedFlightSites} from '@/hooks/mission/useCustomerMissions';
import {displayLabel} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {MissionInput, MissionType, SavedFlightSite} from '@/types/customer';
import {defaultFlightPlan} from '@/types/mission/flight-plan.types';

interface SavedFlightSitesBarProps {
    form: MissionInput;
    onApply: (site: SavedFlightSite) => void;
}

export function SavedFlightSitesBar({form, onApply}: SavedFlightSitesBarProps) {
    const {t} = useI18n();
    const sitesQuery = useSavedFlightSites();
    const actions = useMissionActions();

    const [savingOpen, setSavingOpen] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [confirmDeleteSite, setConfirmDeleteSite] = useState<SavedFlightSite | null>(null);
    const [feedback, setFeedback] = useState<{tone: 'info' | 'error'; text: string} | null>(null);

    const sites = sitesQuery.data ?? [];
    const hasValidPlan = Boolean(form.flightPlan && flightPlanComplete(form.flightPlan));
    const hasCoords = (form.latitude != null && form.longitude != null) || hasValidPlan;

    const handleOpenSave = () => {
        setFeedback(null);
        if (!hasCoords) {
            setFeedback({tone: 'error', text: t('capabilities.flightSites.missingCoords')});
            return;
        }
        setPresetName((form.locationName?.trim() || form.title?.trim() || '').slice(0, 120));
        setSavingOpen(true);
    };

    const handleSaveCurrent = async () => {
        const trimmedName = presetName.trim().slice(0, 120);
        if (!trimmedName) return;
        setFeedback(null);
        try {
            const created = await actions.createSite.mutateAsync({
                name: trimmedName,
                locationName: (form.locationName?.trim() || trimmedName).slice(0, 255),
                latitude: form.latitude,
                longitude: form.longitude,
                defaultMissionType: form.missionType,
                flightPlan: hasValidPlan ? (form.flightPlan ?? undefined) : undefined,
                notes: form.notes?.trim() ? form.notes.trim().slice(0, 1000) : undefined,
            });
            setSavingOpen(false);
            setPresetName('');
            setFeedback({
                tone: 'info',
                text: t('capabilities.flightSites.savedToast', {name: created.name}),
            });
        } catch (err) {
            setFeedback({
                tone: 'error',
                text: err instanceof Error && err.message ? err.message : t('missionDetail.actionFailed'),
            });
        }
    };

    const handleConfirmDelete = async () => {
        if (!confirmDeleteSite) return;
        setFeedback(null);
        try {
            await actions.deleteSite.mutateAsync(confirmDeleteSite.id);
            setConfirmDeleteSite(null);
            setFeedback({tone: 'info', text: t('capabilities.flightSites.deletedToast')});
        } catch (err) {
            setConfirmDeleteSite(null);
            setFeedback({
                tone: 'error',
                text: err instanceof Error && err.message ? err.message : t('missionDetail.actionFailed'),
            });
        }
    };

    return (
        <Card
            role="region"
            aria-label={t('capabilities.flightSites.title')}
            className="col-span-full bg-slate-50/70"
        >
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0 px-4 py-3.5">
                <div className="min-w-0">
                    <CardTitle className="m-0 inline-flex items-center gap-2 text-sm font-bold text-foreground">
                        <Bookmark size={16} className="text-primary" aria-hidden="true" />
                        {t('capabilities.flightSites.title')}
                    </CardTitle>
                    <CardDescription className="m-0 mt-1 text-xs text-muted">
                        {t('capabilities.flightSites.subtitle')}
                    </CardDescription>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={actions.createSite.isPending}
                    leftIcon={<BookmarkPlus size={14} aria-hidden="true" />}
                    onClick={handleOpenSave}
                    className="bg-white"
                >
                    {t('capabilities.flightSites.saveCurrent')}
                </Button>
            </CardHeader>

            <CardContent className="space-y-3 px-4 pb-4 pt-0">
                {feedback && (
                    <Alert
                        variant={feedback.tone === 'error' ? 'error' : 'info'}
                        role={feedback.tone === 'error' ? 'alert' : 'status'}
                        className="py-2.5 text-xs"
                    >
                        {feedback.text}
                    </Alert>
                )}

                {savingOpen && (
                    <Card className="p-3">
                        <div className="flex flex-wrap items-end gap-2.5">
                            <FormField
                                id="saved-flight-site-name"
                                label={t('capabilities.flightSites.nameLabel')}
                                optional={false}
                                className="min-w-[220px] flex-1"
                            >
                                <Input
                                    id="saved-flight-site-name"
                                    type="text"
                                    maxLength={120}
                                    value={presetName}
                                    placeholder={t('capabilities.flightSites.namePlaceholder')}
                                    onChange={e => setPresetName(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </FormField>
                            <Button
                                type="button"
                                size="sm"
                                isLoading={actions.createSite.isPending}
                                disabled={!presetName.trim() || actions.createSite.isPending}
                                onClick={() => void handleSaveCurrent()}
                            >
                                {t('capabilities.flightSites.saveConfirm')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={actions.createSite.isPending}
                                onClick={() => setSavingOpen(false)}
                            >
                                {t('capabilities.flightSites.cancel')}
                            </Button>
                        </div>
                    </Card>
                )}

                {sites.length === 0 ? (
                    <p className="m-0 pt-2 text-xs text-muted">{t('capabilities.flightSites.empty')}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-2.5 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                        {sites.map(site => (
                            <Card key={site.id} className="flex flex-col justify-between gap-2.5 p-3">
                                <div className="min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="truncate text-xs font-bold text-foreground">
                                            {site.name}
                                        </span>
                                        <Badge
                                            size="sm"
                                            className="shrink-0 border border-sky-200 bg-sky-50 text-uav-blue"
                                        >
                                            {site.flightPlan?.areaType ?? 'POINT'}
                                        </Badge>
                                    </div>
                                    <p className="m-0 mt-1 flex items-center gap-1 truncate text-xs text-muted">
                                        <MapPin size={12} className="shrink-0" aria-hidden="true" />
                                        {site.locationName}
                                    </p>
                                    <p className="m-0 mt-1 text-[11px] text-slate-500">
                                        {displayLabel(site.defaultMissionType)}
                                        {site.flightPlan?.altitudeAglMeters
                                            ? ` · ${site.flightPlan.altitudeAglMeters} m AGL`
                                            : ''}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            onApply(site);
                                            setFeedback({
                                                tone: 'info',
                                                text: t('capabilities.flightSites.appliedToast', {name: site.name}),
                                            });
                                        }}
                                        className="h-7 px-2.5 text-xs font-bold"
                                    >
                                        {t('capabilities.flightSites.apply')}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        aria-label={`${t('capabilities.flightSites.deleteConfirm')} ${site.name}`}
                                        onClick={() => setConfirmDeleteSite(site)}
                                        className="h-7 w-7 p-0 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-danger"
                                    >
                                        <Trash2 size={13} aria-hidden="true" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>

            <ConfirmDialog
                open={confirmDeleteSite !== null}
                variant="danger"
                title={t('capabilities.flightSites.deleteTitle')}
                description={
                    confirmDeleteSite
                        ? t('capabilities.flightSites.deleteDescription', {name: confirmDeleteSite.name})
                        : ''
                }
                confirmLabel={t('capabilities.flightSites.deleteConfirm')}
                cancelLabel={t('capabilities.flightSites.cancel')}
                onCancel={() => {
                    if (!actions.deleteSite.isPending) setConfirmDeleteSite(null);
                }}
                onConfirm={() => void handleConfirmDelete()}
            />
        </Card>
    );
}

export function applySavedSiteToForm(
    current: MissionInput,
    site: SavedFlightSite,
): {nextForm: MissionInput; nextMissionType: MissionType} {
    const storedPlan = site.flightPlan;
    const basePlan = defaultFlightPlan();
    const mappedPlan = storedPlan
        ? {
              areaType: storedPlan.areaType,
              vertices: storedPlan.vertices.map(([lat, lng]) => [lat, lng] as [number, number]),
              radiusMeters: storedPlan.radiusMeters ?? basePlan.radiusMeters,
              takeoffLatitude: storedPlan.takeoffLatitude ?? site.latitude ?? undefined,
              takeoffLongitude: storedPlan.takeoffLongitude ?? site.longitude ?? undefined,
              altitudeAglMeters: storedPlan.altitudeAglMeters ?? basePlan.altitudeAglMeters,
              targetGsdCm: storedPlan.targetGsdCm ?? basePlan.targetGsdCm,
              forwardOverlap: storedPlan.forwardOverlap ?? basePlan.forwardOverlap,
              sideOverlap: storedPlan.sideOverlap ?? basePlan.sideOverlap,
              sensors: storedPlan.sensors?.length ? [...storedPlan.sensors] : basePlan.sensors,
              obstacles: storedPlan.obstacles ?? '',
              permitSupport: Boolean(storedPlan.permitSupport),
          }
        : current.flightPlan;

    return {
        nextMissionType: site.defaultMissionType,
        nextForm: {
            ...current,
            missionType: site.defaultMissionType,
            locationName: site.locationName,
            latitude: site.latitude ?? storedPlan?.takeoffLatitude ?? current.latitude,
            longitude: site.longitude ?? storedPlan?.takeoffLongitude ?? current.longitude,
            flightPlan: mappedPlan,
            notes: current.notes?.trim() ? current.notes : (site.notes ?? ''),
        },
    };
}
