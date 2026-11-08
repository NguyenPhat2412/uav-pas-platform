'use client';

import {Check, CircleAlert, FileText, Presentation, Video, X} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {Button, Input, Spinner} from '@/components/ui';
import {
    formatFileSize,
    LESSON_TYPE_LABELS,
    TRAINING_IMAGE_TYPES,
    TRAINING_PDF_TYPE,
    TRAINING_VIDEO_TYPES,
} from '@/utils/training/course-helpers';
import type {BulkLessonType, BulkRejectReason} from '@/utils/training/course-helpers';

export type BulkStatus = 'waiting' | 'uploading' | 'saving' | 'done' | 'error';
export type BulkFile = {key: string; file: File; fraction: number; assetId: number | null; error: string | null};
export type BulkLesson = {key: string; type: BulkLessonType; title: string; files: BulkFile[]; status: BulkStatus; error: string | null};

export const BULK_ACCEPT = [...TRAINING_VIDEO_TYPES, TRAINING_PDF_TYPE, ...TRAINING_IMAGE_TYPES].join(',');
const BULK_TYPE_ICONS: Record<BulkLessonType, LucideIcon> = {VIDEO: Video, DOCUMENT: FileText, SLIDES: Presentation};

export const BULK_REJECT_MESSAGES: Record<BulkRejectReason, string> = {
    type: 'định dạng không dùng được (chỉ video MP4/WebM, PDF hoặc ảnh PNG/JPEG/WebP).',
    size: 'tệp rỗng hoặc quá lớn (video tối đa 500 MB, PDF 50 MB, ảnh 10 MB).',
    office: 'tệp Word/PowerPoint/Excel chỉ dùng làm tài liệu đính kèm: mở một bài và thêm ở mục “Tài liệu đính kèm”, hoặc dán liên kết Google vào bài Tài liệu.',
};

export const bulkErrorText = (cause: unknown) =>
    cause instanceof Error && cause.message ? cause.message : 'Không thành công. Thử lại.';

/** A dropped video's length in whole minutes (at least 1), read from its metadata; 5 if it cannot be read in time. */
export function readVideoMinutes(file: File): Promise<number> {
    return new Promise(resolve => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        const finish = (minutes: number) => {
            window.clearTimeout(timer);
            video.removeAttribute('src');
            URL.revokeObjectURL(url);
            resolve(minutes);
        };
        const timer = window.setTimeout(() => finish(5), 5000);
        video.preload = 'metadata';
        video.onloadedmetadata = () =>
            finish(Number.isFinite(video.duration) && video.duration > 0 ? Math.max(1, Math.round(video.duration / 60)) : 5);
        video.onerror = () => finish(5);
        video.src = url;
    });
}

let bulkKeySeed = 0;
export const bulkKey = () => `bulk-${(bulkKeySeed += 1)}`;

export function TrainingBulkLessonQueueList({
    items,
    running,
    onRenameItem,
    onRemoveItem,
}: {
    items: BulkLesson[];
    running: boolean;
    onRenameItem: (key: string, title: string) => void;
    onRemoveItem: (key: string) => void;
}) {
    return (
        <ol className="divide-y divide-border rounded-panel border border-border">
            {items.map(item => {
                const Icon = BULK_TYPE_ICONS[item.type];
                const editable = !running && item.status !== 'done';
                return (
                    <li key={item.key} className="space-y-1.5 px-3 py-2">
                        <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0 text-muted" aria-label={LESSON_TYPE_LABELS[item.type]} />
                            <Input
                                value={item.title}
                                disabled={!editable}
                                aria-label="Tên bài"
                                aria-invalid={!item.title.trim()}
                                onChange={event => onRenameItem(item.key, event.target.value)}
                                className="text-xs"
                            />
                            <span className="w-20 shrink-0 text-right text-[11px] text-muted-foreground">
                                {LESSON_TYPE_LABELS[item.type]}
                                {item.type === 'SLIDES' && ` · ${item.files.length}`}
                            </span>
                            <BulkStatusMark status={item.status} />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 shrink-0 px-0"
                                disabled={!editable}
                                onClick={() => onRemoveItem(item.key)}
                                aria-label="Bỏ khỏi danh sách"
                                title="Bỏ khỏi danh sách"
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        {item.status !== 'done' && (
                            <ul className="space-y-1 pl-6">
                                {item.files.map(entry => {
                                    const percent = Math.round(entry.fraction * 100);
                                    return (
                                        <li key={entry.key} className="space-y-0.5">
                                            <div className="flex justify-between gap-2 text-[11px] text-muted">
                                                <span className="truncate">
                                                    {entry.file.name} · {formatFileSize(entry.file.size)}
                                                </span>
                                                <span className="shrink-0 tabular-nums">
                                                    {entry.assetId !== null ? 'Đã tải lên' : `${percent}%`}
                                                </span>
                                            </div>
                                            <div
                                                className="h-1 overflow-hidden rounded-full bg-surface-variant"
                                                role="progressbar"
                                                aria-valuenow={percent}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-label={`Tải lên ${entry.file.name}`}
                                            >
                                                <div className="h-full bg-slate-700 transition-[width]" style={{width: `${percent}%`}} />
                                            </div>
                                            {entry.error && <p className="text-[11px] text-danger">{entry.error}</p>}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {item.error && <p className="pl-6 text-[11px] text-danger" role="alert">{item.error}</p>}
                    </li>
                );
            })}
        </ol>
    );
}

function BulkStatusMark({status}: {status: BulkStatus}) {
    if (status === 'done') return <Check className="h-4 w-4 shrink-0 text-slate-700" aria-label="Đã tạo bài" />;
    if (status === 'error') return <CircleAlert className="h-4 w-4 shrink-0 text-danger" aria-label="Lỗi" />;
    if (status === 'uploading' || status === 'saving') {
        return <Spinner size="sm" aria-label={status === 'saving' ? 'Đang tạo bài' : 'Đang tải lên'} />;
    }
    return <span className="h-4 w-4 shrink-0" aria-hidden />;
}
