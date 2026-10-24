/** Decimal limits shared by mission uploads and the media library. */
export const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm';
export const MEDIA_UPLOAD_POLICY = 'JPEG/PNG/WebP/PDF: tối đa 100 MB; MP4/WebM: tối đa 1 GB.';
export const MEDIA_UPLOAD_RETENTION = 'Tệp chưa xác nhận hết hạn sau 24 giờ. Tệp đã xác nhận và kết quả bàn giao được giữ lại.';
export type Translate = (key: string, params?: Record<string, string | number>) => string;

// Without a translator the Vietnamese default is returned, which keeps these helpers usable outside React.
export function mediaUploadPolicy(t?: Translate): string {
    return t ? t('opsAssets.mediaPolicy.policy') : MEDIA_UPLOAD_POLICY;
}

export function mediaUploadRetention(t?: Translate): string {
    return t ? t('opsAssets.mediaPolicy.retention') : MEDIA_UPLOAD_RETENTION;
}

export class MediaFileError extends Error {
}

export function validateMediaFile(file: Pick<File, 'type' | 'size'>, t?: Translate): string {
    const limits: Record<string, number> = {
        'image/jpeg': 100_000_000, 'image/png': 100_000_000, 'image/webp': 100_000_000,
        'application/pdf': 100_000_000, 'video/mp4': 1_000_000_000, 'video/webm': 1_000_000_000,
    };
    const max = limits[file.type];
    if (!max || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > max) {
        throw new MediaFileError(t ? t('opsAssets.mediaPolicy.invalidFile', {policy: mediaUploadPolicy(t)}) : `${MEDIA_UPLOAD_POLICY} Tệp phải có nội dung và đúng định dạng cho phép.`);
    }
    return file.type;
}
