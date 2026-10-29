'use client';

import {useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {Upload} from 'lucide-react';
import {trainingService} from '@/lib/api/resources';
import type {TrainingAssetConfirmation} from '@/features/training/types/training.types';
import {
    formatFileSize,
    TRAINING_IMAGE_MAX_BYTES,
    TRAINING_IMAGE_TYPES,
    TRAINING_PDF_MAX_BYTES,
    TRAINING_PDF_TYPE,
    TRAINING_VIDEO_MAX_BYTES,
    TRAINING_VIDEO_TYPES,
    trainingAssetError,
} from '@/features/training/utils/course-helpers';
import type {TrainingAssetKind} from '@/features/training/utils/course-helpers';

const KIND_RULES: Record<TrainingAssetKind, {accept: string; hint: string}> = {
    video: {
        accept: TRAINING_VIDEO_TYPES.join(','),
        hint: `MP4 hoặc WebM, tối đa ${formatFileSize(TRAINING_VIDEO_MAX_BYTES)}`,
    },
    image: {
        accept: TRAINING_IMAGE_TYPES.join(','),
        hint: `PNG, JPEG hoặc WebP, tối đa ${formatFileSize(TRAINING_IMAGE_MAX_BYTES)}`,
    },
    pdf: {
        accept: TRAINING_PDF_TYPE,
        hint: `Một tệp PDF, tối đa ${formatFileSize(TRAINING_PDF_MAX_BYTES)}`,
    },
    resource: {
        accept: [TRAINING_PDF_TYPE, ...TRAINING_IMAGE_TYPES].join(','),
        hint: `PDF tối đa ${formatFileSize(TRAINING_PDF_MAX_BYTES)}; ảnh PNG, JPEG, WebP tối đa ${formatFileSize(TRAINING_IMAGE_MAX_BYTES)}`,
    },
};

function fileProblem(file: File, kind: TrainingAssetKind): string | null {
    const problem = trainingAssetError(file, kind);
    if (problem === 'type') return `${file.name}: định dạng không hỗ trợ (${KIND_RULES[kind].hint}).`;
    if (problem === 'size') return `${file.name}: tệp rỗng hoặc quá lớn (${KIND_RULES[kind].hint}).`;
    return null;
}

/**
 * Pick file(s), check type and size, then upload each one in turn (register → PUT to storage →
 * confirm) with a progress bar. `onUploaded` runs once per READY asset.
 */
export function TrainingAssetUpload({kind, multiple = false, label, icon, onUploaded, disabled = false}: {
    kind: TrainingAssetKind;
    multiple?: boolean;
    label: string;
    icon?: ReactNode;
    onUploaded: (asset: TrainingAssetConfirmation, file: File) => void;
    disabled?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<{index: number; total: number; name: string; fraction: number} | null>(null);
    const [error, setError] = useState<string | null>(null);

    const run = async (files: File[]) => {
        setError(null);
        const problems = files.map(file => fileProblem(file, kind)).filter((problem): problem is string => problem !== null);
        if (problems.length > 0) {
            setError(problems.join(' '));
            return;
        }
        for (const [index, file] of files.entries()) {
            setStatus({index, total: files.length, name: file.name, fraction: 0});
            try {
                const asset = await trainingService.uploadAsset(file, fraction =>
                    setStatus(current => (current ? {...current, fraction} : current)));
                onUploaded(asset, file);
            } catch (cause) {
                setError(`${file.name}: ${cause instanceof Error ? cause.message : 'tải lên thất bại.'}`);
                break;
            }
        }
        setStatus(null);
    };

    const percent = status ? Math.round(status.fraction * 100) : 0;
    return (
        <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    disabled={disabled || status !== null}
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-surface-variant disabled:opacity-50"
                >
                    {icon ?? <Upload className="h-3.5 w-3.5" />}
                    {label}
                </button>
                <span className="text-[11px] text-muted-foreground">{KIND_RULES[kind].hint}</span>
                <input
                    ref={inputRef}
                    type="file"
                    hidden
                    accept={KIND_RULES[kind].accept}
                    multiple={multiple}
                    onChange={event => {
                        const files = Array.from(event.target.files ?? []);
                        event.target.value = '';
                        if (files.length > 0) void run(files);
                    }}
                />
            </div>
            {status && (
                <div className="space-y-1" role="status" aria-live="polite">
                    <div className="flex justify-between gap-2 text-[11px] text-muted">
                        <span className="truncate">
                            {status.total > 1 && `${status.index + 1}/${status.total} · `}{status.name}
                        </span>
                        <span className="tabular-nums">{percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-variant" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ tải lên">
                        <div className="h-full bg-slate-700 transition-[width]" style={{width: `${percent}%`}} />
                    </div>
                </div>
            )}
            {error && <p className="text-[11px] text-danger" role="alert">{error}</p>}
        </div>
    );
}
