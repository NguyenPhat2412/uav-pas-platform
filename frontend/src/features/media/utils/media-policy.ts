/** Decimal limits shared by mission uploads and the media library. */
export const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm';
export const MEDIA_UPLOAD_POLICY = 'JPEG/PNG/WebP/PDF: tối đa 100 MB; MP4/WebM: tối đa 1 GB.';
export const MEDIA_UPLOAD_RETENTION = 'Tệp chưa xác nhận hết hạn sau 24 giờ. Tệp đã xác nhận và kết quả bàn giao được giữ lại.';
import type {Translate} from '@/types';

export type {Translate};

// Without a translator the Vietnamese default is returned, which keeps these helpers usable outside React.
export function mediaUploadPolicy(t?: Translate): string {
    return t ? t('opsAssets.mediaPolicy.policy') : MEDIA_UPLOAD_POLICY;
}

export function mediaUploadRetention(t?: Translate): string {
    return t ? t('opsAssets.mediaPolicy.retention') : MEDIA_UPLOAD_RETENTION;
}
