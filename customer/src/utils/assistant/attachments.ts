import type {AttachmentKind, PendingAttachment} from '@/types/assistant/assistant.types';

/** Limits mirror the backend: at most 8 images per question, re-encoded so each stays far below 1.5 MB. */
export const MAX_ATTACHMENTS = 8;
export const FRAMES_PER_VIDEO = 4;
const FULL_EDGE = 1280;
const THUMB_EDGE = 320;

let sequence = 0;

/** Draws a source onto a white canvas no larger than maxEdge and returns a JPEG data URL. */
function encode(source: CanvasImageSource, width: number, height: number, maxEdge: number, quality: number): string {
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    // Transparent PNG areas would turn black in JPEG.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
}

function pending(kind: AttachmentKind, name: string, source: CanvasImageSource, width: number, height: number): PendingAttachment {
    const src = encode(source, width, height, FULL_EDGE, 0.82);
    return {id: `att-${Date.now()}-${sequence++}`, kind, name, src, thumb: encode(source, width, height, THUMB_EDGE, 0.7), data: src.slice(src.indexOf(',') + 1)};
}

export async function imageAttachment(file: File): Promise<PendingAttachment> {
    const bitmap = await createImageBitmap(file);
    try {
        return pending('IMAGE', file.name, bitmap, bitmap.width, bitmap.height);
    } finally {
        bitmap.close();
    }
}

function once(target: HTMLVideoElement, event: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('timeout')), 15_000);
        target.addEventListener(event, () => {
            window.clearTimeout(timer);
            resolve();
        }, {once: true});
        target.addEventListener('error', () => {
            window.clearTimeout(timer);
            reject(new Error('video'));
        }, {once: true});
    });
}

function clock(seconds: number) {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Models read images, not video, so a video becomes a few evenly spaced frames labelled with their time. */
export async function videoAttachments(file: File, frames: number): Promise<PendingAttachment[]> {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    try {
        await once(video, 'loadeddata');
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const times = duration > 0 && frames > 1
            ? Array.from({length: frames}, (_, i) => duration * (0.08 + (0.84 * i) / (frames - 1)))
            : [0];
        const out: PendingAttachment[] = [];
        for (const time of times) {
            video.currentTime = time;
            await once(video, 'seeked');
            out.push(pending('VIDEO_FRAME', `${file.name} · ${clock(time)}`, video, video.videoWidth, video.videoHeight));
        }
        return out;
    } finally {
        video.removeAttribute('src');
        video.load();
        URL.revokeObjectURL(url);
    }
}
