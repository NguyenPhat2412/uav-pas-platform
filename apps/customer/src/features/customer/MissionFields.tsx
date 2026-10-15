'use client';
import { displayLabel } from '@uav/ui/presentation';
import type { ChangeEvent } from 'react';
import type { MissionInput } from './types';
import { localDateToday, missionLimits, type MissionFormErrors } from './mission-form';

export function MissionFields({ form, onChange, errors = {} }: { form: MissionInput; onChange: (form: MissionInput) => void; errors?: MissionFormErrors }) {
  const set = (key: keyof MissionInput) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.value;
    onChange({ ...form, [key]: key === 'latitude' || key === 'longitude' ? value === '' ? undefined : Number(value) : value });
  };
  const attributes = (key: keyof MissionInput) => ({ id: `mission-${key}`, 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? `mission-${key}-error` : undefined });
  const error = (key: keyof MissionInput) => errors[key] ? <span className="field-error" id={`mission-${key}-error`}>{errors[key]}</span> : null;
  return <>
    <label className="field"><span>Tiêu đề <span aria-hidden="true">*</span></span><input {...attributes('title')} value={form.title} onChange={set('title')} required maxLength={missionLimits.title} />{error('title')}</label>
    <label className="field"><span>Ngày yêu cầu <span aria-hidden="true">*</span></span><input {...attributes('requestedDate')} type="date" value={form.requestedDate} min={localDateToday()} onChange={set('requestedDate')} required />{error('requestedDate')}</label>
    <label className="field"><span>Bắt đầu <span aria-hidden="true">*</span></span><input {...attributes('startTime')} type="datetime-local" step="any" value={form.startTime} onChange={set('startTime')} required />{error('startTime')}</label>
    <label className="field"><span>Kết thúc dự kiến <span aria-hidden="true">*</span></span><input {...attributes('expectedEndTime')} type="datetime-local" step="any" value={form.expectedEndTime} onChange={set('expectedEndTime')} required />{error('expectedEndTime')}</label>
    <p className="form-hint form-wide">Thời gian được giữ nguyên như khi nhập, không tự quy đổi múi giờ. Hãy thống nhất giờ tại nơi thực hiện với đội vận hành.</p>
    <label className="field"><span>Địa điểm <span aria-hidden="true">*</span></span><input {...attributes('locationName')} value={form.locationName} onChange={set('locationName')} maxLength={missionLimits.locationName} required />{error('locationName')}</label>
    <label className="field"><span>Mức ưu tiên</span><select {...attributes('priority')} value={form.priority ?? 'NORMAL'} onChange={set('priority')}>{['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(priority => <option key={priority} value={priority}>{displayLabel(priority)}</option>)}</select>{error('priority')}</label>
    <label className="field"><span>Vĩ độ (tùy chọn)</span><input {...attributes('latitude')} type="number" min={-90} max={90} step="0.0000001" value={form.latitude ?? ''} onChange={set('latitude')} />{error('latitude')}</label>
    <label className="field"><span>Kinh độ (tùy chọn)</span><input {...attributes('longitude')} type="number" min={-180} max={180} step="0.0000001" value={form.longitude ?? ''} onChange={set('longitude')} />{error('longitude')}</label>
    <label className="field form-wide"><span>Mô tả</span><textarea {...attributes('description')} value={form.description ?? ''} onChange={set('description')} maxLength={missionLimits.description} rows={4} />{error('description')}<span className="form-hint">Tối đa 2.000 ký tự.</span></label>
    <label className="field form-wide"><span>Ghi chú</span><textarea {...attributes('notes')} value={form.notes ?? ''} onChange={set('notes')} maxLength={missionLimits.notes} rows={3} />{error('notes')}<span className="form-hint">Tối đa 2.000 ký tự.</span></label>
  </>;
}

export function MissionErrorSummary({ errors }: { errors: MissionFormErrors }) {
  if (!Object.keys(errors).length) return null;
  return <div className="error form-error-summary" role="alert" tabIndex={-1} id="mission-error-summary"><strong>Vui lòng kiểm tra thông tin:</strong><ul>{Object.entries(errors).map(([key, message]) => <li key={key}><a href={`#mission-${key}`}>{message}</a></li>)}</ul></div>;
}

export function focusMissionErrors() {
  requestAnimationFrame(() => document.getElementById('mission-error-summary')?.focus());
}
