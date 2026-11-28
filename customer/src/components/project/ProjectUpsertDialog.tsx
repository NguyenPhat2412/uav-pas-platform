'use client';

import {useRef, useState} from 'react';
import {MapPin, X} from 'lucide-react';
import {LocationPicker} from '@/components/mission/customer/LocationPicker';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import {Alert, Button} from '@/components/ui';
import {extractActionableError} from '@/forms/marketplace-forms';
import {
    flightPlanToGeoJson,
    geoJsonToFlightPlan,
    validateProjectInput,
} from '@/forms/project-form';
import {useProjectActions} from '@/hooks/useCustomerProjects';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/providers/I18nContext';
import type {FlightPlanInput} from '@/types/flight-plan.types';
import type {CustomerProject} from '@/types/project.types';

export function ProjectUpsertDialog({
    open,
    editingProject,
    onClose,
    onSaved,
}: {
    open: boolean;
    editingProject?: CustomerProject | null;
    onClose: () => void;
    onSaved?: (project: CustomerProject) => void;
}) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLDivElement>(null);
    useDialogFocusTrap(dialogRef, open, onClose);
    const actions = useProjectActions();

    const [name, setName] = useState(editingProject?.name ?? '');
    const [province, setProvince] = useState(editingProject?.province ?? '');
    const [note, setNote] = useState(editingProject?.note ?? '');
    const [showMap, setShowMap] = useState(Boolean(editingProject?.areaGeoJson));
    const [flightPlan, setFlightPlan] = useState<FlightPlanInput>(() =>
        geoJsonToFlightPlan(editingProject?.areaGeoJson),
    );
    const [errorText, setErrorText] = useState<string | null>(null);

    if (!open) return null;

    const busy = actions.createProject.isPending || actions.updateProject.isPending;
    const areaGeoJson = showMap ? flightPlanToGeoJson(flightPlan) : editingProject?.areaGeoJson ?? '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorText(null);
        const invalid = validateProjectInput({name, province, note});
        if (invalid) {
            setErrorText(t('missionForm.checkErrors'));
            return;
        }
        try {
            const payload = {
                name,
                province,
                note: note || undefined,
                areaGeoJson: areaGeoJson || undefined,
            };
            const saved = editingProject
                ? await actions.updateProject.mutateAsync({id: editingProject.id, payload})
                : await actions.createProject.mutateAsync(payload);
            onSaved?.(saved);
            onClose();
        } catch (err) {
            setErrorText(
                err instanceof ApiError && err.status === 404
                    ? t('marketplaceShop.bookingApiUnavailable')
                    : extractActionableError(err, t('missionDetail.actionFailed')),
            );
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-xs sm:items-center sm:p-4">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="project-upsert-dialog-title"
                className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-panel"
            >
            <form onSubmit={e => void handleSubmit(e)} className="flex max-h-[92dvh] flex-1 flex-col overflow-hidden">
                <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
                    <h2 id="project-upsert-dialog-title" className="m-0 truncate text-base font-bold text-slate-900">
                        {editingProject ? t('marketplaceShop.editProjectBtn') : t('marketplaceShop.newProjectBtn')}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('common.close')}
                        className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        <X size={18} aria-hidden="true"/>
                    </button>
                </header>

                <div className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-5">
                    {errorText && (
                        <Alert variant="error" role="alert" className="text-xs">
                            {errorText}
                        </Alert>
                    )}

                    <label className="block space-y-1 text-xs font-semibold text-slate-800">
                        <span>{t('marketplaceShop.projectName')}<RequiredMark/></span>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={t('marketplaceShop.projectNamePlaceholder')}
                            className="h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-primary"
                        />
                    </label>

                    <label className="block space-y-1 text-xs font-semibold text-slate-800">
                        <span>{t('marketplaceShop.projectProvince')}<RequiredMark/></span>
                        <input
                            type="text"
                            required
                            value={province}
                            onChange={e => setProvince(e.target.value)}
                            placeholder={t('marketplaceShop.projectProvincePlaceholder')}
                            className="h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-primary"
                        />
                    </label>

                    <label className="block space-y-1 text-xs font-semibold text-slate-800">
                        <span>{t('marketplaceShop.projectNote')}<OptionalMark/></span>
                        <textarea
                            rows={2}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder={t('marketplaceShop.projectNotePlaceholder')}
                            className="w-full rounded-control border border-slate-300 bg-white p-3 text-sm font-normal text-slate-900 outline-none focus:border-primary"
                        />
                    </label>

                    <div className="space-y-2 border-t border-slate-100 pt-2">
                        <button
                            type="button"
                            aria-expanded={showMap}
                            onClick={() => setShowMap(v => !v)}
                            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-control border border-slate-200 bg-slate-50 px-3 text-xs font-semibold whitespace-nowrap text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            <MapPin size={14} className="text-primary" aria-hidden="true"/>
                            <span>{t('marketplaceShop.stepArea')}</span>
                            <OptionalMark/>
                        </button>
                        {showMap && (
                            <LocationPicker plan={flightPlan} onChange={next => setFlightPlan(next)}/>
                        )}
                    </div>
                </div>

                <footer className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                    <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" isLoading={busy} disabled={busy} className="min-h-11 px-5 whitespace-nowrap">
                        {t('common.save')}
                    </Button>
                </footer>
            </form>
            </div>
        </div>
    );
}
