'use client';
import {displayLabel} from "@/components/shared/presentation";
import type {ChangeEvent} from 'react';
import type {MissionInput} from "@/types/customer";
import {LocationPicker} from "@/features/missions/components/customer/LocationPicker";
import {localDateToday, type MissionFormErrors, missionLimits} from "@/features/missions/forms/mission-form";
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

export function MissionFields({form, onChange, errors = {}}: {
    form: MissionInput;
    onChange: (form: MissionInput) => void;
    errors?: MissionFormErrors
}) {
    const {t} = useI18n();
    const set = (key: keyof MissionInput) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = event.target.value;
        onChange({
            ...form,
            [key]: key === 'latitude' || key === 'longitude' ? value === '' ? undefined : Number(value) : value
        });
    };
    const attributes = (key: keyof MissionInput) => ({
        id: `mission-${key}`,
        'aria-invalid': !!errors[key],
        'aria-describedby': errors[key] ? `mission-${key}-error` : undefined
    });
    const error = (key: keyof MissionInput) => errors[key] ?
        <span className="field-error" id={`mission-${key}-error`}>{errors[key]}</span> : null;
    return <>
        <label className="field"><span>{t('missionForm.title')}<RequiredMark/></span><input {...attributes('title')}
                                                                                              value={form.title}
                                                                                              onChange={set('title')}
                                                                                              required
                                                                                              maxLength={missionLimits.title}/>{error('title')}
        </label>
        <label className="field"><span>{t('missionForm.requestedDate')}<RequiredMark/></span><input {...attributes('requestedDate')} type="date"
                                                     value={form.requestedDate} min={localDateToday()}
                                                     onChange={set('requestedDate')} required/>{error('requestedDate')}
        </label>
        <label className="field"><span>{t('missionForm.start')}<RequiredMark/></span><input {...attributes('startTime')} type="datetime-local" step="any"
                                                     value={form.startTime} onChange={set('startTime')}
                                                     required/>{error('startTime')}</label>
        <label className="field"><span>{t('missionForm.expectedEnd')}<RequiredMark/></span><input {...attributes('expectedEndTime')} type="datetime-local" step="any"
                                                     value={form.expectedEndTime} onChange={set('expectedEndTime')}
                                                     required/>{error('expectedEndTime')}</label>
        <p className="form-hint form-wide">{t('missionForm.timeHint')}</p>
        <label className="field"><span>{t('missionForm.location')}<RequiredMark/></span><input {...attributes('locationName')} value={form.locationName}
                                                     onChange={set('locationName')}
                                                     maxLength={missionLimits.locationName}
                                                     required/>{error('locationName')}</label>
        <label className="field"><span>{t('missionForm.priority')}</span><select {...attributes('priority')}
                                                                 value={form.priority ?? 'NORMAL'}
                                                                 onChange={set('priority')}>{['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(priority =>
            <option key={priority} value={priority}>{displayLabel(priority)}</option>)}</select>{error('priority')}
        </label>
        <LocationPicker latitude={form.latitude} longitude={form.longitude}
                        onChange={(latitude, longitude) => onChange({...form, latitude, longitude})}/>
        <label className="field"><span>{t('missionForm.latitude')}</span><input {...attributes('latitude')} type="number" min={-90}
                                                                     max={90} step="0.0000001"
                                                                     value={form.latitude ?? ''}
                                                                     onChange={set('latitude')}/>{error('latitude')}
        </label>
        <label className="field"><span>{t('missionForm.longitude')}</span><input {...attributes('longitude')} type="number"
                                                                       min={-180} max={180} step="0.0000001"
                                                                       value={form.longitude ?? ''}
                                                                       onChange={set('longitude')}/>{error('longitude')}
        </label>
        <label className="field form-wide"><span>{t('missionForm.description')}</span><textarea {...attributes('description')}
                                                                       value={form.description ?? ''}
                                                                       onChange={set('description')}
                                                                       maxLength={missionLimits.description}
                                                                       rows={4}/>{error('description')}<span
            className="form-hint">{t('missionForm.maxChars')}</span></label>
        <label className="field form-wide"><span>{t('missionForm.notes')}</span><textarea {...attributes('notes')}
                                                                         value={form.notes ?? ''}
                                                                         onChange={set('notes')}
                                                                         maxLength={missionLimits.notes}
                                                                         rows={3}/>{error('notes')}<span
            className="form-hint">{t('missionForm.maxChars')}</span></label>
    </>;
}

export function MissionErrorSummary({errors}: { errors: MissionFormErrors }) {
    const {t} = useI18n();
    if (!Object.keys(errors).length) return null;
    return <div className="error form-error-summary" role="alert" tabIndex={-1} id="mission-error-summary"><strong>{t('missionForm.checkErrors')}</strong>
        <ul>{Object.entries(errors).map(([key, message]) => <li key={key}><a href={`#mission-${key}`}>{message}</a>
        </li>)}</ul>
    </div>;
}

export function focusMissionErrors() {
    requestAnimationFrame(() => document.getElementById('mission-error-summary')?.focus());
}
