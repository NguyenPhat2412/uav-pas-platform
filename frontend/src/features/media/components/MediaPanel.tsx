'use client';
import {MEDIA_ACCEPT, mediaUploadPolicy, mediaUploadRetention, validateMediaFile} from "@/lib/api/media-policy";
import {displayLabel} from "@/components/shared/presentation";
import {useState} from 'react';
import {Badge, Button, Input} from '@/components/ui';
import {useAuth} from '@/contexts/AuthContext';
import {useOperationMutation} from "@/hooks/useOperations";
import {useCollection} from "@/hooks/useCollections";
import {operationsService as service} from "@/lib/api/resources";
import type {MediaAsset} from "@/types/resources";
import {DataTable, Detail, ErrorNotice, selectClass} from "@/components/data/ResourceState";
import {QueryState} from '@/components/data/WorkspaceState';
import {apiRequest} from '@/lib/api';
import {useI18n} from '@/contexts/I18nContext';

export function MediaPanel() {
    const {can} = useAuth();
    const {t} = useI18n();
    const query = useCollection('media');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [file, setFile] = useState<File>();
    const [link, setLink] = useState({type: '', id: ''});
    const [stage, setStage] = useState<{ key: string; params?: Record<string, string | number> }>();
    const [incompleteUploadId, setIncompleteUploadId] = useState<number>();
    const [preview, setPreview] = useState<{ asset: MediaAsset; url: string }>();
    const [deleting, setDeleting] = useState<number>();
    const upload = useOperationMutation(async ({file, existing}: { file: File; existing?: MediaAsset }) => {
        const contentType = validateMediaFile(file, t);
        if (existing && (existing.size !== file.size || existing.contentType !== contentType)) throw new Error(t('opsAssets.media.reuploadMismatch'));
        setIncompleteUploadId(undefined);
        setStage({key: 'opsAssets.media.stage.registering'});
        const asset = existing || await service.registerMedia({
            originalName: file.name, contentType, size: file.size,
            type: contentType.startsWith('video/') ? 'VIDEO' : contentType.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
            linkedEntityType: link.type || undefined, linkedEntityId: link.type ? link.id : undefined
        });
        setIncompleteUploadId(asset.id);
        setStage({key: 'opsAssets.media.stage.uploading', params: {id: asset.id}});
        const signed = await service.uploadUrl(asset.id);
        await apiRequest<void>(signed.url, {
            method: 'PUT',
            headers: {'If-None-Match': '*', 'Content-Type': contentType},
            body: file
        });
        setStage({key: 'opsAssets.media.stage.confirming'});
        await service.confirmMedia(asset.id);
        setIncompleteUploadId(undefined);
        setStage({key: 'opsAssets.media.stage.uploaded'});
    }, ['media', 'audit']);
    const confirm = useOperationMutation(service.confirmMedia, ['media', 'audit']);
    const remove = useOperationMutation(service.deleteMedia, ['media', 'audit']);
    const open = useOperationMutation(service.downloadUrl, ['audit']);
    const runUpload = async (selected: File, existing?: MediaAsset) => {
        confirm.reset();
        open.reset();
        try {
            await upload.mutateAsync({file: selected, existing});
        } catch {
            setStage({key: 'opsAssets.media.stage.failed'});
        } finally {
            await query.refetch();
        }
    };
    const confirmAsset = async (id: number) => {
        upload.reset();
        open.reset();
        try {
            await confirm.mutateAsync(id);
            if (id === incompleteUploadId) setIncompleteUploadId(undefined);
            setStage({key: 'opsAssets.media.stage.confirmed'});
        } catch { /* Visible confirmation error replaces the preceding upload error. */
        }
    };
    return <div className="space-y-5">
        {can('MEDIA_MANAGE') &&
            <form className="space-y-3 rounded-xl border border-border bg-slate-50 p-4 shadow-sm"
                  onSubmit={event => {
                      event.preventDefault();
                      if (file) void runUpload(file);
                  }}>
                <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3"><Input id="media-upload-file"
                                                                                      label={t('opsAssets.media.uploadFile')} type="file"
                                                                                      accept={MEDIA_ACCEPT} required
                                                                                      disabled={upload.isPending}
                                                                                      onChange={event => setFile(event.target.files?.[0])}/><label
                    className="flex flex-col gap-1 text-sm">{t('opsAssets.media.linkResource')}<select className={selectClass}
                                                                                       value={link.type}
                                                                                       onChange={event => setLink({
                                                                                           type: event.target.value,
                                                                                           id: ''
                                                                                       })}>
                    <option value="">{t('opsAssets.media.ownFile')}</option>
                    {['MISSION', 'STATION', 'UAV', 'EQUIPMENT'].map(type => <option key={type}
                                                                                    value={type}>{displayLabel(type)}</option>)}
                </select></label>{link.type &&
                    <Input id="media-resource-id" label={t('opsAssets.media.resourceId')} type="number" required min={1} step={1}
                           value={link.id} onChange={event => setLink({...link, id: event.target.value})}/>}</div>
                <Button type="submit" disabled={upload.isPending || !file}>{t('opsAssets.media.uploadAndConfirm')}</Button><p role="status"
                                                                                                          className="text-sm text-secondary">{stage ? t(stage.key, stage.params) : mediaUploadPolicy(t) + ' ' + mediaUploadRetention(t)}</p>
            </form>}
        <ErrorNotice error={upload.error || confirm.error || open.error}/>
        <QueryState query={query}>
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 sm:px-6 sm:py-5"><Input label={t('opsAssets.media.search')} aria-label={t('opsAssets.media.search')} placeholder={t('opsAssets.media.searchPlaceholder')}
                                                      value={search} onChange={event => setSearch(event.target.value)}/><select
                aria-label={t('opsAssets.media.typeFilter')} className={selectClass} value={typeFilter}
                onChange={event => setTypeFilter(event.target.value)}>
                <option value="">{t('opsAssets.media.allTypes')}</option>
                {[...new Set((query.data || []).map(asset => asset.type))].map(type => <option key={type}
                                                                                               value={type}>{displayLabel(type)}</option>)}
            </select></div>
            <DataTable headers={[t('opsAssets.media.col.name'), t('opsAssets.media.col.typeSize'), t('opsAssets.media.col.status'), t('opsAssets.media.col.uploadedBy'), t('opsAssets.media.col.actions')]}
                       rows={(query.data || []).filter(asset => (!typeFilter || asset.type === typeFilter) && (!search || asset.originalName.toLowerCase().includes(search.toLowerCase()))).map(asset => [asset.originalName, asset.contentType + ' · ' + asset.size + ' B',
                           <Badge key={asset.id}
                                  variant={asset.confirmed ? 'success' : 'warning'}>{asset.confirmed ? t('opsAssets.media.confirmed') : t('opsAssets.media.pending')}</Badge>, asset.uploadedBy || '—',
                           <div key={asset.id} className="flex flex-wrap gap-2">{asset.confirmed &&
                               <Button size="sm" variant="outline" disabled={open.isPending} onClick={async () => {
                                   try {
                                       const signed = await open.mutateAsync(asset.id);
                                       setPreview({asset, url: signed.url});
                                   } catch { /* Visible error. */
                                   }
                               }}>{t('opsAssets.media.viewDownload')}</Button>}{can('MEDIA_MANAGE') && <>{!asset.confirmed && <><Button
                               size="sm" variant="outline" disabled={confirm.isPending || upload.isPending}
                               onClick={() => void confirmAsset(asset.id)}>{t('opsAssets.media.confirm')}</Button><label
                               className="relative cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">{t('opsAssets.media.reupload')}<input aria-label={t('opsAssets.media.reuploadLabel', {name: asset.originalName})} type="file" accept={MEDIA_ACCEPT}
                                         className="sr-only" disabled={upload.isPending} onChange={event => {
                                   const chosen = event.target.files?.[0];
                                   if (chosen) void runUpload(chosen, asset);
                                   event.target.value = '';
                               }}/></label></>}<Button size="sm" variant="outline" onClick={() => {
                               remove.reset();
                               setDeleting(asset.id);
                           }}>{t('opsAssets.media.delete')}</Button></>}</div>])}/></QueryState>
        {deleting && <Detail title={t('opsAssets.media.deleteTitle')} onClose={() => setDeleting(undefined)}><ErrorNotice
            error={remove.error?.message === 'Media is attached to a mission' ? new Error(t('opsAssets.media.attachedToMission')) : remove.error}/>
            <p className="text-sm">{t('opsAssets.media.deleteNote')}</p><Button variant="danger"
                                                                                             disabled={remove.isPending}
                                                                                             onClick={async () => {
                                                                                                 try {
                                                                                                     await remove.mutateAsync(deleting);
                                                                                                     if (preview?.asset.id === deleting) setPreview(undefined);
                                                                                                     if (incompleteUploadId === deleting) {
                                                                                                         upload.reset();
                                                                                                         setIncompleteUploadId(undefined);
                                                                                                         setStage({key: 'opsAssets.media.stage.deletedIncomplete'});
                                                                                                     }
                                                                                                     setDeleting(undefined);
                                                                                                 } catch { /* Visible error. */
                                                                                                 }
                                                                                             }}>{t('opsAssets.media.confirmDelete')}</Button></Detail>}
        {preview && <Detail title={t('opsAssets.media.previewTitle', {name: preview.asset.originalName})} onClose={() => setPreview(undefined)}>
            {['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(preview.asset.contentType) ?
                /* Signed image URLs expire and cannot use Next image optimization. */
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.asset.originalName}
                     className="max-h-96 max-w-full rounded-lg object-contain"/>
                : ['video/mp4', 'video/webm'].includes(preview.asset.contentType) ?
                    <video controls src={preview.url} className="max-h-96 w-full"/>
                    : <p className="text-sm text-secondary">{t('opsAssets.media.useDownload')}</p>}
            <a className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
               href={preview.url} target="_blank" rel="noopener noreferrer">{t('opsAssets.media.openDownload')}</a><p
            className="text-xs text-secondary">{t('opsAssets.media.linkValidity')}</p>
        </Detail>}
    </div>;
}
