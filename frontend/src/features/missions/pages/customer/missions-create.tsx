'use client';
import Link from 'next/link';
import {displayLabel, serviceName} from "@/components/shared/presentation";
import {useRouter, useSearchParams} from 'next/navigation';
import {useState} from 'react';
import {PageGuard} from "@/components/customer/layout";
import {Button, Panel} from "@/components/customer/ui";
import {useAuth} from '@/contexts/AuthContext';
import {useMissionActions, useServices} from "@/lib/query/customer";
import {customerService} from "@/lib/api/customer";
import {
    focusMissionErrors,
    MissionErrorSummary,
    MissionFields
} from "@/features/missions/components/customer/MissionFields";
import {
    missionFormError,
    type MissionFormErrors,
    missionTypeForService,
    missionTypes,
    missionUpdatePayload,
    validateMissionForm
} from "@/features/missions/forms/mission-form";
import type {MissionInput, MissionType} from "@/types/customer";
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

const initial: MissionInput = {
    missionType: 'AREA_INSPECTION',
    title: '',
    description: '',
    requestedDate: '',
    startTime: '',
    expectedEndTime: '',
    locationName: '',
    priority: 'NORMAL',
    notes: ''
};
export default function CreateMissionPage() {
    return <PageGuard permission="MISSION_CREATE"><CreateMission/></PageGuard>;
}

function CreateMission() {
    const router = useRouter();
    const params = useSearchParams();
    const services = useServices();
    const actions = useMissionActions();
    const {can} = useAuth();
    const {t, formatDate} = useI18n();
    const [formValues, setForm] = useState<MissionInput>({
        ...initial,
        serviceId: params.has('serviceId') ? Number(params.get('serviceId')) || -1 : undefined
    });
    const [missionTypeOverride, setMissionTypeOverride] = useState<MissionType | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [errors, setErrors] = useState<MissionFormErrors>({});
    const [error, setError] = useState('');
    const [availability, setAvailability] = useState<'' | 'ok' | 'conflict' | 'draft'>('');
    const [checking, setChecking] = useState(false);
    const activeServices = (services.data ?? []).filter(service => service.active);
    const selectedService = activeServices.find(service => service.id === formValues.serviceId);
    // Resolve a linked service after its catalogue arrives; keep an explicit type choice.
    const form: MissionInput = {
        ...formValues,
        missionType: missionTypeOverride ?? missionTypeForService(selectedService?.code, formValues.missionType)
    };
    const validate = () => {
        const nextErrors = validateMissionForm(form, undefined, t);
        if (form.serviceId != null && !selectedService) nextErrors.serviceId = t('missionCreate.serviceUnavailable');
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            setStep(1);
            focusMissionErrors();
            return false;
        }
        return true;
    };
    const review = async () => {
        setError('');
        if (!validate()) return;
        setChecking(true);
        try {
            if (can('MISSION_VIEW')) {
                const result = await customerService.availability(form.startTime, form.expectedEndTime);
                setAvailability(result.available ? 'ok' : 'conflict');
            } else setAvailability('draft');
            setStep(2);
        } catch {
            setError(t('missionCreate.availabilityError'));
        } finally {
            setChecking(false);
        }
    };
    const canSendNow = can('MISSION_UPDATE');
    const busy = actions.create.isPending || actions.submit.isPending;
    const submit = async (sendNow: boolean) => {
        setError('');
        if (!validate()) return;
        try {
            const mission = await actions.create.mutateAsync({
                ...missionUpdatePayload(form),
                missionType: form.missionType,
                serviceId: form.serviceId
            });
            // A failed send still leaves a saved draft; the detail page offers "Gửi xác nhận" again.
            if (sendNow) await actions.submit.mutateAsync(mission.id).catch(() => undefined);
            router.replace(`/customer/missions/${mission.id}`);
        } catch (err) {
            setError(missionFormError(err, t));
        }
    };
    return <>
        <Link href="/customer/missions" className="mission-back">{t('missionCreate.back')}</Link>
        <div className="page-heading">
            <div><h1>{t('missionCreate.title')}</h1><p>{t('missionCreate.subtitle')}</p></div>
        </div>
        <Panel title={step === 1 ? t('missionCreate.step1') : t('missionCreate.step2')}>
            {error &&
                <div className="error form-error-summary" role="alert">{error} <Link href="/customer/missions">{t('missionCreate.viewMissions')}</Link></div>}
            {step === 1 ? <form onSubmit={event => {
                event.preventDefault();
                void review();
            }}>
                <MissionErrorSummary errors={errors}/>
                {services.isError &&
                    <div className="notice" role="alert">{t('missionCreate.servicesError')} <Button type="button" variant="secondary"
                                                    onClick={() => void services.refetch()}>{t('missionCreate.reloadServices')}</Button>
                    </div>}
                <fieldset disabled={checking}>
                    <legend className="visually-hidden">{t('missionCreate.requestDetails')}</legend>
                    <div className="form-grid">
                        <label className="field"><span>{t('missionCreate.serviceOptional')}</span><select id="mission-serviceId"
                                                                                        value={form.serviceId ?? ''}
                                                                                        aria-invalid={!!errors.serviceId}
                                                                                        aria-describedby={errors.serviceId ? 'mission-serviceId-error' : undefined}
                                                                                        onChange={event => {
                                                                                            const service = activeServices.find(item => item.id === Number(event.target.value));
                                                                                            setMissionTypeOverride(null);
                                                                                            setForm(value => ({
                                                                                                ...value,
                                                                                                serviceId: event.target.value ? Number(event.target.value) : undefined,
                                                                                                missionType: missionTypeForService(service?.code, form.missionType)
                                                                                            }));
                                                                                        }}>
                            <option value="">{t('missionCreate.noService')}</option>
                            {form.serviceId != null && !selectedService && <option
                                value={form.serviceId}>{services.isLoading ? t('missionCreate.loadingSelectedService') : t('missionCreate.serviceUnavailableOption')}</option>}{activeServices.map(service =>
                            <option key={service.id} value={service.id}>{serviceName(service)}</option>)}
                        </select>{errors.serviceId &&
                            <span className="field-error" id="mission-serviceId-error">{errors.serviceId}</span>}
                        </label>
                        <label className="field"><span>{t('missions.type')}<RequiredMark/></span><select id="mission-missionType" required
                                                                                   value={form.missionType}
                                                                                   onChange={event => setMissionTypeOverride(event.target.value as MissionType)}>{missionTypes.map(type =>
                            <option key={type} value={type}>{displayLabel(type)}</option>)}</select></label>
                        <MissionFields form={form} onChange={setForm} errors={errors}/>
                        <div className="form-actions form-wide"><Button type="submit"
                                                                        disabled={checking || (form.serviceId != null && services.isLoading)}>{checking ? t('missionCreate.checking') : t('missionCreate.review')}</Button>
                        </div>
                    </div>
                </fieldset>
            </form> : <>
                <dl className="grid grid-2 mission-review">
                    <div>
                        <dt>{t('missionForm.title')}</dt>
                        <dd>{form.title.trim()}</dd>
                    </div>
                    <div>
                        <dt>{t('missionCreate.service')}</dt>
                        <dd>{selectedService ? serviceName(selectedService) : t('missionCreate.noService')}</dd>
                    </div>
                    <div>
                        <dt>{t('missions.type')}</dt>
                        <dd>{displayLabel(form.missionType)}</dd>
                    </div>
                    <div>
                        <dt>{t('missionForm.requestedDate')}</dt>
                        <dd>{form.requestedDate}</dd>
                    </div>
                    <div>
                        <dt>{t('missionCreate.time')}</dt>
                        <dd>{formatDate(form.startTime)} → {formatDate(form.expectedEndTime)}</dd>
                    </div>
                    <div>
                        <dt>{t('missionForm.location')}</dt>
                        <dd>{form.locationName.trim()}</dd>
                    </div>
                    <div>
                        <dt>{t('missionForm.priority')}</dt>
                        <dd>{displayLabel(form.priority ?? 'NORMAL')}</dd>
                    </div>
                    <div>
                        <dt>{t('missionCreate.coordinates')}</dt>
                        <dd>{t('missionCreate.coordinatesValue', {lat: form.latitude ?? t('missionCreate.notEntered'), lng: form.longitude ?? t('missionCreate.notEntered')})}</dd>
                    </div>
                    {form.description && <div className="form-wide">
                        <dt>{t('missionForm.description')}</dt>
                        <dd>{form.description}</dd>
                    </div>}{form.notes && <div className="form-wide">
                    <dt>{t('missionForm.notes')}</dt>
                    <dd>{form.notes}</dd>
                </div>}
                </dl>
                <div className="notice" style={{marginTop: 16}}>{availability && t(`missionCreate.${{ok: 'availabilityOk', conflict: 'availabilityConflict', draft: 'availabilityDraft'}[availability]}`)}</div>
                <div className="form-actions">
                    <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={busy}>{t('missionCreate.edit')}</Button>
                    <Button type="button" variant={canSendNow ? 'secondary' : undefined} onClick={() => void submit(false)}
                            disabled={busy}>{actions.create.isPending && !actions.submit.isPending ? t('missionCreate.saving') : t('missionCreate.saveDraft')}</Button>
                    {canSendNow && <Button type="button" onClick={() => void submit(true)}
                                           disabled={busy}>{busy ? t('missionCreate.sending') : t('missionCreate.sendNow')}</Button>}
                </div>
            </>}
        </Panel>
    </>;
}
