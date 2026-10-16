'use client';
import { displayLabel } from '@uav/ui/presentation';
import { useState } from 'react';
import { Badge, Button, Input } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useOperationMutation } from '../hooks/useOperations';
import { useCollection } from '../hooks/useCollections';
import { operationsService as service } from '../services/operations.service';
import type { MediaAsset } from '../types/operations.types';
import { DataTable, Detail, ErrorNotice, selectClass } from './ResourceState';
import { QueryState } from '@/components/data/WorkspaceState';
import { apiRequest } from '@/lib/api.client';

export function MediaPanel() {
  const { can } = useAuth();
  const query = useCollection('media');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [file, setFile] = useState<File>();
  const [link, setLink] = useState({ type: '', id: '' });
  const [stage, setStage] = useState('');
  const [incompleteUploadId, setIncompleteUploadId] = useState<number>();
  const [preview, setPreview] = useState<{ asset: MediaAsset; url: string }>();
  const [deleting, setDeleting] = useState<number>();
  const upload = useOperationMutation(async ({ file, existing }: { file: File; existing?: MediaAsset }) => {
    const contentType = file.type || 'application/octet-stream';
    if (!file.size) throw new Error('Tệp phải có nội dung.');
    if (existing && (existing.size !== file.size || existing.contentType !== contentType)) throw new Error('Tệp tải lại phải có cùng kích thước và định dạng đã đăng ký.');
    setIncompleteUploadId(undefined);
    setStage('Đang đăng ký tệp…');
    const asset = existing || await service.registerMedia({ originalName: file.name, contentType, size: file.size,
      type: contentType.startsWith('video/') ? 'VIDEO' : contentType.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
      linkedEntityType: link.type || undefined, linkedEntityId: link.type ? link.id : undefined });
    setIncompleteUploadId(asset.id);
    setStage(`Đang tải nội dung #${asset.id}…`);
    const signed = await service.uploadUrl(asset.id);
    await apiRequest<void>(signed.url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
    setStage('Đang xác nhận nội dung…');
    await service.confirmMedia(asset.id);
    setIncompleteUploadId(undefined);
    setStage('Đã tải và xác nhận tệp.');
  }, ['media', 'audit']);
  const confirm = useOperationMutation(service.confirmMedia, ['media', 'audit']);
  const remove = useOperationMutation(service.deleteMedia, ['media', 'audit']);
  const open = useOperationMutation(service.downloadUrl, ['audit']);
  const runUpload = async (selected: File, existing?: MediaAsset) => {
    try { await upload.mutateAsync({ file: selected, existing }); }
    catch { setStage('Tải tệp chưa hoàn tất. Kiểm tra lỗi bên dưới; metadata đã tạo vẫn có thể tải lại hoặc xóa.'); }
    finally { await query.refetch(); }
  };
  const confirmAsset = async (id: number) => {
    try {
      await confirm.mutateAsync(id);
      if (id === incompleteUploadId) {
        upload.reset();
        setIncompleteUploadId(undefined);
        setStage('Đã xác nhận tệp. Bạn có thể xem hoặc tải xuống.');
      }
    } catch { /* Visible error. */ }
  };
  return <div className="space-y-5">
    {can('MEDIA_MANAGE') && <form className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={event => { event.preventDefault(); if (file) void runUpload(file); }}><div className="grid gap-3 md:grid-cols-3"><Input id="media-upload-file" label="Tệp tải lên" type="file" required disabled={upload.isPending} onChange={event => setFile(event.target.files?.[0])} /><label className="flex flex-col gap-1 text-sm">Liên kết tài nguyên<select className={selectClass} value={link.type} onChange={event => setLink({ type: event.target.value, id: '' })}><option value="">Tệp riêng của tôi</option>{['MISSION', 'STATION', 'UAV', 'EQUIPMENT'].map(type => <option key={type} value={type}>{displayLabel(type)}</option>)}</select></label>{link.type && <Input id="media-resource-id" label="Mã tài nguyên" type="number" required min={1} step={1} value={link.id} onChange={event => setLink({ ...link, id: event.target.value })} />}</div><Button type="submit" disabled={upload.isPending || !file}>Tải lên và xác nhận</Button><p role="status" className="text-sm text-secondary">{stage || 'Tệp chỉ có thể tải xuống sau khi hệ thống kiểm tra kích thước và định dạng.'}</p></form>}
    <ErrorNotice error={upload.error || confirm.error || open.error} />
    <QueryState query={query}><div className="mb-3 flex flex-wrap gap-2"><Input aria-label="Tìm tệp" placeholder="Tên tệp…" value={search} onChange={event => setSearch(event.target.value)} /><select aria-label="Lọc loại tệp" className={selectClass} value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="">Tất cả loại</option>{[...new Set((query.data || []).map(asset => asset.type))].map(type => <option key={type} value={type}>{displayLabel(type)}</option>)}</select></div><DataTable headers={['Tên tệp', 'Loại / dung lượng', 'Trạng thái', 'Người tải', 'Thao tác']} rows={(query.data || []).filter(asset => (!typeFilter || asset.type === typeFilter) && (!search || asset.originalName.toLowerCase().includes(search.toLowerCase()))).map(asset => [asset.originalName, asset.contentType + ' · ' + asset.size + ' B', <Badge key={asset.id} variant={asset.confirmed ? 'success' : 'warning'}>{asset.confirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}</Badge>, asset.uploadedBy || '—', <div key={asset.id} className="flex flex-wrap gap-2">{asset.confirmed && <Button size="sm" variant="outline" disabled={open.isPending} onClick={async () => { try { const signed = await open.mutateAsync(asset.id); setPreview({ asset, url: signed.url }); } catch { /* Visible error. */ } }}>Xem / tải xuống</Button>}{can('MEDIA_MANAGE') && <>{!asset.confirmed && <><Button size="sm" variant="outline" disabled={confirm.isPending || upload.isPending} onClick={() => void confirmAsset(asset.id)}>Xác nhận</Button><label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">Tải lại<input aria-label={'Tải lại ' + asset.originalName} type="file" className="sr-only" disabled={upload.isPending} onChange={event => { const chosen = event.target.files?.[0]; if (chosen) void runUpload(chosen, asset); event.target.value = ''; }} /></label></>}<Button size="sm" variant="outline" onClick={() => { remove.reset(); setDeleting(asset.id); }}>Xóa</Button></>}</div>])} /></QueryState>
    {deleting && <Detail title="Xóa tệp" onClose={() => setDeleting(undefined)}><ErrorNotice error={remove.error?.message === 'Media is attached to a mission' ? new Error('Không thể xóa tệp đang gắn với nhiệm vụ.') : remove.error} /><p className="text-sm">Tệp đang gắn với nhiệm vụ được giữ lại. Tệp khác sẽ được xóa khỏi thư viện và kho lưu trữ.</p><Button variant="danger" disabled={remove.isPending} onClick={async () => { try { await remove.mutateAsync(deleting); if (preview?.asset.id === deleting) setPreview(undefined); if (incompleteUploadId === deleting) { upload.reset(); setIncompleteUploadId(undefined); setStage('Đã xóa tệp chưa hoàn tất.'); } setDeleting(undefined); } catch { /* Visible error. */ } }}>Xác nhận xóa</Button></Detail>}
    {preview && <Detail title={`Xem tệp: ${preview.asset.originalName}`} onClose={() => setPreview(undefined)}>
      {['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(preview.asset.contentType) ?
        /* Signed image URLs expire and cannot use Next image optimization. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.url} alt={preview.asset.originalName} className="max-h-96 max-w-full rounded-lg object-contain" />
        : ['video/mp4', 'video/webm'].includes(preview.asset.contentType) ? <video controls src={preview.url} className="max-h-96 w-full" />
        : <p className="text-sm text-secondary">Dùng liên kết tải xuống để xem định dạng này.</p>}
      <a className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" href={preview.url} target="_blank" rel="noopener noreferrer">Mở / tải xuống tệp</a><p className="text-xs text-secondary">Liên kết có hiệu lực trong 15 phút.</p>
    </Detail>}
  </div>;
}
