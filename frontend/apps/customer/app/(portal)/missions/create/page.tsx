'use client';
import Link from 'next/link';
import { displayLabel, serviceName } from '@uav/ui/presentation';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { PageGuard } from '@/components/layout';
import { Button, Panel } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useServices, useMissionActions } from '@/features/customer/hooks';
import { customerService } from '@/features/customer/service';
import { MissionErrorSummary, MissionFields, focusMissionErrors } from '@/features/customer/MissionFields';
import { missionFormError, missionTypes, missionTypeForService, missionUpdatePayload, validateMissionForm, type MissionFormErrors } from '@/features/customer/mission-form';
import type { MissionInput, MissionType } from '@/features/customer/types';

const initial: MissionInput = { missionType: 'AREA_INSPECTION', title: '', description: '', requestedDate: '', startTime: '', expectedEndTime: '', locationName: '', priority: 'NORMAL', notes: '' };
export default function CreateMissionPage() { return <PageGuard permission="MISSION_CREATE"><CreateMission /></PageGuard>; }
function CreateMission() {
  const router = useRouter();
  const params = useSearchParams();
  const services = useServices();
  const actions = useMissionActions();
  const { can } = useAuth();
  const [form, setForm] = useState<MissionInput>({ ...initial, serviceId: params.has('serviceId') ? Number(params.get('serviceId')) || -1 : undefined });
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<MissionFormErrors>({});
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState('');
  const [checking, setChecking] = useState(false);
  const activeServices = (services.data ?? []).filter(service => service.active);
  const selectedService = activeServices.find(service => service.id === form.serviceId);
  const validate = () => {
    const nextErrors = validateMissionForm(form);
    if (form.serviceId != null && !selectedService) nextErrors.serviceId = 'Dịch vụ không còn khả dụng. Chọn lại dịch vụ hoặc bỏ lựa chọn này.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setStep(1); focusMissionErrors(); return false; }
    return true;
  };
  const review = async () => {
    setError('');
    if (!validate()) return;
    setChecking(true);
    try {
      if (can('MISSION_VIEW')) {
        const result = await customerService.availability(form.startTime, form.expectedEndTime);
        setAvailability(result.available ? 'Khoảng thời gian hợp lệ. Đội điều phối sẽ kiểm tra và giữ tài nguyên khi phân công.' : 'Khung giờ có xung đột tài nguyên. Bạn vẫn có thể lưu nháp để điều chỉnh hoặc trao đổi với đội điều phối.');
      } else setAvailability('Yêu cầu sẽ được lưu nháp. Đội điều phối sẽ kiểm tra tài nguyên khi tiếp nhận.');
      setStep(2);
    } catch { setError('Không thể kiểm tra khung giờ lúc này. Dữ liệu đã nhập vẫn được giữ; vui lòng thử lại.'); }
    finally { setChecking(false); }
  };
  const submit = async () => {
    setError('');
    if (!validate()) return;
    try {
      const mission = await actions.create.mutateAsync({ ...missionUpdatePayload(form), missionType: form.missionType, serviceId: form.serviceId });
      router.replace(`/missions/${mission.id}`);
    } catch (err) { setError(missionFormError(err)); }
  };
  return <>
    <Link href="/missions" className="mission-back">← Nhiệm vụ của tôi</Link>
    <div className="page-heading"><div><h1>Tạo yêu cầu UAV</h1><p>Điền thông tin yêu cầu, kiểm tra lại rồi lưu bản nháp trước khi gửi xác nhận.</p></div></div>
    <Panel title={step === 1 ? '1. Thông tin yêu cầu' : '2. Kiểm tra và lưu bản nháp'}>
      {error && <div className="error form-error-summary" role="alert">{error} <Link href="/missions">Xem danh sách nhiệm vụ</Link></div>}
      {step === 1 ? <form onSubmit={event => { event.preventDefault(); void review(); }}>
        <MissionErrorSummary errors={errors} />
        {services.isError && <div className="notice" role="alert">Chưa tải được dịch vụ. Bạn có thể thử lại hoặc tạo yêu cầu không chọn dịch vụ. <Button type="button" variant="secondary" onClick={() => void services.refetch()}>Tải lại dịch vụ</Button></div>}
        <fieldset disabled={checking}><legend className="visually-hidden">Thông tin yêu cầu</legend><div className="form-grid">
          <label className="field"><span>Dịch vụ (tùy chọn)</span><select id="mission-serviceId" value={form.serviceId ?? ''} aria-invalid={!!errors.serviceId} aria-describedby={errors.serviceId ? 'mission-serviceId-error' : undefined} onChange={event => {
            const service = activeServices.find(item => item.id === Number(event.target.value));
            setForm(value => ({ ...value, serviceId: event.target.value ? Number(event.target.value) : undefined, missionType: missionTypeForService(service?.code, value.missionType) }));
          }}><option value="">Không chọn dịch vụ</option>{form.serviceId != null && !selectedService && <option value={form.serviceId}>{services.isLoading ? 'Đang tải dịch vụ đã chọn…' : 'Dịch vụ không khả dụng — hãy chọn lại'}</option>}{activeServices.map(service => <option key={service.id} value={service.id}>{serviceName(service)}</option>)}</select>{errors.serviceId && <span className="field-error" id="mission-serviceId-error">{errors.serviceId}</span>}</label>
          <label className="field"><span>Loại nhiệm vụ</span><select id="mission-missionType" value={form.missionType} onChange={event => setForm(value => ({ ...value, missionType: event.target.value as MissionType }))}>{missionTypes.map(type => <option key={type} value={type}>{displayLabel(type)}</option>)}</select></label>
          <MissionFields form={form} onChange={setForm} errors={errors} />
          <div className="form-actions form-wide"><Button type="submit" disabled={checking || (form.serviceId != null && services.isLoading)}>{checking ? 'Đang kiểm tra…' : 'Kiểm tra & xem lại'}</Button></div>
        </div></fieldset>
      </form> : <>
        <dl className="grid grid-2 mission-review">
          <div><dt>Tiêu đề</dt><dd>{form.title.trim()}</dd></div><div><dt>Dịch vụ</dt><dd>{selectedService ? serviceName(selectedService) : 'Không chọn dịch vụ'}</dd></div>
          <div><dt>Loại nhiệm vụ</dt><dd>{displayLabel(form.missionType)}</dd></div><div><dt>Ngày yêu cầu</dt><dd>{form.requestedDate}</dd></div>
          <div><dt>Thời gian</dt><dd>{new Date(form.startTime).toLocaleString('vi-VN')} → {new Date(form.expectedEndTime).toLocaleString('vi-VN')}</dd></div><div><dt>Địa điểm</dt><dd>{form.locationName.trim()}</dd></div>
          <div><dt>Mức ưu tiên</dt><dd>{displayLabel(form.priority ?? 'NORMAL')}</dd></div><div><dt>Tọa độ</dt><dd>Vĩ độ: {form.latitude ?? 'Chưa nhập'} · Kinh độ: {form.longitude ?? 'Chưa nhập'}</dd></div>
          {form.description && <div className="form-wide"><dt>Mô tả</dt><dd>{form.description}</dd></div>}{form.notes && <div className="form-wide"><dt>Ghi chú</dt><dd>{form.notes}</dd></div>}
        </dl>
        <div className="notice" style={{ marginTop: 16 }}>{availability}</div>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={actions.create.isPending}>Chỉnh sửa</Button><Button type="button" onClick={() => void submit()} disabled={actions.create.isPending}>{actions.create.isPending ? 'Đang lưu…' : 'Lưu bản nháp'}</Button></div>
      </>}
    </Panel>
  </>;
}
