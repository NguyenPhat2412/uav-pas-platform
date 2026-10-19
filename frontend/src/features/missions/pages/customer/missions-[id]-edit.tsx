'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { displayLabel, serviceName } from "@/components/shared/presentation";
import { PageGuard } from "@/components/customer/layout";
import { Button, Panel } from "@/components/customer/ui";
import { useAuth } from '@/contexts/AuthContext';
import { useMission, useMissionActions, useServices } from "@/lib/query/customer";
import { MissionErrorSummary, MissionFields, focusMissionErrors } from "@/features/missions/components/customer/MissionFields";
import { canEditMission, missionFormError, missionFormFromDetail, validateMissionForm, type MissionFormErrors } from "@/features/missions/forms/mission-form";
import type { Mission } from "@/types/customer";

export default function EditMissionPage() { return <PageGuard><EditMission /></PageGuard>; }

function EditMission() {
  const { id } = useParams<{ id: string }>();
  const query = useMission(Number(id));
  const { user, can } = useAuth();
  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) return <div className="notice" role="alert">Mã nhiệm vụ không hợp lệ. <Link href="/customer/missions">Về danh sách</Link></div>;
  if (query.isLoading) return <div role="status">Đang tải bản nháp…</div>;
  const accessDenied = query.error && 'status' in query.error && [401, 403, 404].includes(Number(query.error.status));
  if (accessDenied || !query.data) return <div className="error" role="alert">Không thể tải nhiệm vụ hoặc bạn không có quyền truy cập. <Button variant="secondary" onClick={() => void query.refetch()}>Thử lại</Button> <Link href="/customer/missions">Về danh sách</Link></div>;
  const mission = query.data;
  if (mission.customerId !== user?.id) return <div className="notice" role="alert">Bạn chỉ có thể chỉnh sửa yêu cầu thuộc tài khoản của mình. <Link href="/customer/missions">Về danh sách</Link></div>;
  if (!canEditMission(mission, user?.id, can('MISSION_UPDATE'))) return <div className="notice" role="alert">{mission.status !== 'DRAFT' ? 'Yêu cầu đã chuyển trạng thái. Chỉ bản nháp mới có thể chỉnh sửa.' : 'Bạn chưa được cấp quyền chỉnh sửa yêu cầu.'} <Link href={`/customer/missions/${mission.id}`}>Xem chi tiết nhiệm vụ</Link></div>;
  return <DraftEditor key={mission.id} mission={mission} reload={async () => { const result = await query.refetch(); if (result.isError) throw result.error; return result.data; }} />;
}

function DraftEditor({ mission, reload }: { mission: Mission; reload: () => Promise<Mission | undefined> }) {
  const router = useRouter();
  const actions = useMissionActions();
  const services = useServices();
  const [form, setForm] = useState(() => missionFormFromDetail(mission));
  // Keep the version paired with the visible form, even if a background refetch updates the query.
  const [expectedVersion, setExpectedVersion] = useState(mission.version);
  const [errors, setErrors] = useState<MissionFormErrors>({});
  const [error, setError] = useState('');
  const [mustReload, setMustReload] = useState(false);
  const [reloading, setReloading] = useState(false);
  const selectedService = services.data?.find(service => service.id === mission.serviceId);
  const save = async () => {
    setError('');
    const nextErrors = validateMissionForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { focusMissionErrors(); return; }
    if (mustReload) return;
    try {
      await actions.update.mutateAsync({ id: mission.id, data: form, expectedVersion });
      router.replace(`/customer/missions/${mission.id}`);
    } catch (err) {
      setError(missionFormError(err));
      if (err && typeof err === 'object' && 'status' in err && err.status === 409) setMustReload(true);
    }
  };
  const reloadDraft = async () => {
    setReloading(true);
    try {
      const current = await reload();
      if (!current) { setError('Chưa tải được bản nháp mới nhất. Hãy thử lại.'); return; }
      setForm(missionFormFromDetail(current)); setExpectedVersion(current.version); setErrors({}); setError(''); setMustReload(false);
    } catch { setError('Chưa tải được bản nháp mới nhất. Hãy thử lại.'); }
    finally { setReloading(false); }
  };
  return <>
    <Link href={`/customer/missions/${mission.id}`} className="mission-back">← Chi tiết nhiệm vụ</Link>
    <div className="page-heading"><div><h1>Chỉnh sửa bản nháp</h1><p>{mission.code} · Lưu thay đổi để kiểm tra lại trước khi gửi xác nhận.</p></div></div>
    <Panel title="Thông tin yêu cầu">
      <div className="notice form-error-summary"><strong>{displayLabel(mission.missionType)}</strong>{mission.serviceId && <> · {selectedService ? serviceName(selectedService) : `Dịch vụ #${mission.serviceId}`}</>}<p>Dịch vụ và loại nhiệm vụ được giữ nguyên từ lúc tạo yêu cầu.</p></div>
      {error && <div className="error form-error-summary" role="alert">{error}</div>}
      {mustReload && <div className="notice form-error-summary"><p>Tải lại sẽ thay các nội dung đang nhập bằng bản mới nhất. Sau đó, hãy kiểm tra và nhập lại thay đổi cần thiết.</p><Button variant="secondary" disabled={reloading} onClick={() => void reloadDraft()}>{reloading ? 'Đang tải…' : 'Tải bản nháp mới nhất'}</Button></div>}
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <MissionErrorSummary errors={errors} />
        <fieldset disabled={actions.update.isPending || mustReload || reloading}><legend className="visually-hidden">Chỉnh sửa thông tin bản nháp</legend><div className="form-grid"><MissionFields form={form} onChange={setForm} errors={errors} /></div>
          <div className="form-actions"><Link href={`/customer/missions/${mission.id}`} className="button button-secondary">Quay lại chi tiết</Link><Button type="submit">{actions.update.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}</Button></div>
        </fieldset>
      </form>
    </Panel>
  </>;
}
