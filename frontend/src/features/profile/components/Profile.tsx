'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { displayLabel } from "@/components/shared/presentation";
import { Button, Field, Panel } from "@/components/customer/ui";
import { useAuth } from '@/contexts/AuthContext';
import { profileError, validateProfile, type CustomerProfile, type ProfileErrors, type ProfileFields } from "@/features/profile/forms/profile-form";
import { useCustomerProfile, useUpdateCustomerProfile } from "@/features/profile/hooks/profile-query";

export function CustomerProfilePage() {
  const {user}=useAuth();
  return <Profile key={user?.id} />;
}
function Profile() {
  const {user}=useAuth();const query=useCustomerProfile();const update=useUpdateCustomerProfile();
  const [draft,setDraft]=useState<{fields:ProfileFields;revision:string}|null>(null);
  const [errors,setErrors]=useState<ProfileErrors>({});
  const [failure,setFailure]=useState<ReturnType<typeof profileError>|null>(null);
  const [success,setSuccess]=useState('');const [reloading,setReloading]=useState(false);
  const firstInput=useRef<HTMLInputElement>(null);const message=useRef<HTMLDivElement>(null);
  const profile=query.data?.id===user?.id?query.data:undefined;
  const busy=update.isPending||reloading;
  const editing=!!draft;
  useEffect(()=>{if(!editing)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[editing]);
  function edit(value:CustomerProfile) {
    setDraft({fields:{fullName:value.fullName??'',phoneNumber:value.phoneNumber??''},revision:value.revision});
    setErrors({});setFailure(null);setSuccess('');requestAnimationFrame(()=>firstInput.current?.focus());
  }
  function cancel() {setDraft(null);setErrors({});setFailure(null);setSuccess('');}
  async function reload() {
    if(draft&&!window.confirm('Tải bản mới nhất sẽ thay nội dung đang nhập. Bạn có muốn tiếp tục?'))return;
    setReloading(true);
    try {const result=await query.refetch();if(result.error||!result.data)throw result.error;edit(result.data);}
    catch {setFailure({kind:failure?.kind??'other',message:'Chưa tải được hồ sơ. Nội dung đang nhập vẫn được giữ lại. Vui lòng thử lại.'});}
    finally {setReloading(false);}
  }
  async function save(event:FormEvent) {
    event.preventDefault();if(!draft||busy||failure?.kind==='conflict'||failure?.kind==='uncertain')return;
    const invalid=validateProfile(draft.fields);setErrors(invalid);setFailure(null);setSuccess('');
    if(Object.keys(invalid).length){requestAnimationFrame(()=>document.getElementById(invalid.fullName?'profile-name':'profile-phone')?.focus());return;}
    try {await update.mutateAsync(draft);setDraft(null);setSuccess('Đã lưu hồ sơ của bạn.');}
    catch(error){const next=profileError(error);setFailure(next);if(next.kind==='phone')setErrors({phoneNumber:next.message});requestAnimationFrame(()=>message.current?.focus());}
  }
  return <>
    <div className="page-heading"><div><h1>Tài khoản</h1><p>Quản lý thông tin liên hệ của bạn.</p></div></div>
    <div className="profile-layout">
      <Panel title="Thông tin cá nhân" action={!draft&&profile?<Button variant="secondary" onClick={()=>edit(profile)}>Chỉnh sửa hồ sơ</Button>:undefined}>
        {success&&<div className="profile-success" role="status">{success}</div>}
        {!profile&&!query.isError&&<p role="status">Đang tải hồ sơ…</p>}
        {query.isError&&<div className="error" role="alert">Không thể tải thông tin hồ sơ mới nhất. <Button variant="secondary" onClick={()=>void query.refetch()} disabled={query.isFetching}>Thử lại</Button></div>}
        {draft?<form onSubmit={save} noValidate aria-label="Chỉnh sửa thông tin cá nhân">
          {failure&&<div className="error form-error-summary" role="alert" tabIndex={-1} ref={message}>{failure.message}</div>}
          {profile&&profile.revision!==draft.revision&&!failure&&<p className="notice" role="status">Có bản hồ sơ mới hơn. Nội dung đang nhập được giữ nguyên; hãy tải bản mới nhất trước khi lưu.</p>}
          <fieldset disabled={busy} className="form-grid">
            <div className="field"><label htmlFor="profile-name">Họ và tên</label><input id="profile-name" ref={firstInput} autoComplete="name" maxLength={100} value={draft.fields.fullName} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName?'profile-name-error':'profile-name-hint'} onChange={e=>setDraft({...draft,fields:{...draft.fields,fullName:e.target.value}})}/>
              <p className="form-hint" id="profile-name-hint">Tối đa 100 ký tự. Có thể để trống.</p>{errors.fullName&&<p className="field-error" id="profile-name-error">{errors.fullName}</p>}</div>
            <div><Field id="profile-phone" label="Số điện thoại" type="tel" autoComplete="tel" maxLength={20} required value={draft.fields.phoneNumber} aria-invalid={!!errors.phoneNumber} aria-describedby={errors.phoneNumber?'profile-phone-error':'profile-phone-hint'} onChange={e=>setDraft({...draft,fields:{...draft.fields,phoneNumber:e.target.value}})}/>
              <p className="form-hint" id="profile-phone-hint">Bắt buộc. Tối đa 20 ký tự.</p>{errors.phoneNumber&&<p className="field-error" id="profile-phone-error">{errors.phoneNumber}</p>}</div>
          </fieldset>
          {(failure?.kind==='conflict'||failure?.kind==='uncertain'||profile&&profile.revision!==draft.revision)&&<Button type="button" variant="secondary" disabled={busy} onClick={()=>void reload()}>Tải bản mới nhất</Button>}
          <div className="form-actions"><Button type="button" variant="secondary" onClick={cancel} disabled={busy}>Hủy chỉnh sửa</Button><Button type="submit" disabled={busy||failure?.kind==='conflict'||failure?.kind==='uncertain'||!!profile&&profile.revision!==draft.revision}>{update.isPending?'Đang lưu…':'Lưu thay đổi'}</Button></div>
        </form>:profile&&<dl className="grid grid-2 profile-details"><div><dt>Họ và tên</dt><dd>{profile.fullName||'Chưa cập nhật'}</dd></div><div><dt>Số điện thoại</dt><dd>{profile.phoneNumber||'Chưa cập nhật'}</dd></div></dl>}
      </Panel>
      <Panel title="Thông tin tài khoản"><dl className="grid grid-2 profile-details"><div><dt>Tên đăng nhập</dt><dd>{user?.username}</dd></div><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Trạng thái</dt><dd>{displayLabel(user?.status)}</dd></div></dl><p className="form-hint profile-readonly-note">Thông tin tài khoản được quản lý bởi hệ thống. Nếu cần hỗ trợ, vui lòng liên hệ quản trị viên.</p></Panel>
    </div>
  </>;
}
