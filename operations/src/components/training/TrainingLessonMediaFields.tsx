'use client';

import {useState} from 'react';
import type {MutableRefObject} from 'react';
import {
    ArrowDown,
    ArrowUp,
    FileText,
    FileUp,
    ImagePlus,
    Link2,
    Trash2,
    Upload,
    Video,
} from 'lucide-react';
import {Button, FormField, Input, Textarea} from '@/components/ui';
import {RequiredMark} from '@/components/shared/RequiredMark';
import type {TrainingLessonDraft} from '@/forms/training/training-form';
import {TrainingAssetUpload} from '@/components/training/TrainingAssetUpload';
import {TrainingLessonAttachmentsEditor} from '@/components/training/TrainingLessonAttachmentsEditor';
import {MarkdownSopRenderer} from '@/components/training/MarkdownSopRenderer';
import {moveItem} from '@/utils/training/course-helpers';

const iconBtnClass = 'h-7 w-7 shrink-0 px-0';

export interface TrainingLessonMediaFieldsProps {
    draft: TrainingLessonDraft;
    onPatch: (patch: Partial<TrainingLessonDraft>) => void;
    onUpdateDraft: (updater: (current: TrainingLessonDraft) => TrainingLessonDraft) => void;
    fieldErrors?: Partial<Record<string, string>> | null;
    attempted: boolean;
    uploading: boolean;
    onUploadBusy: (busy: boolean) => void;
    objectUrlsRef: MutableRefObject<string[]>;
}

export function TrainingLessonMediaFields({
    draft,
    onPatch,
    onUpdateDraft,
    fieldErrors,
    attempted,
    uploading,
    onUploadBusy,
    objectUrlsRef,
}: TrainingLessonMediaFieldsProps) {
    const [articlePreview, setArticlePreview] = useState(false);
    const moveSlide = (from: number, to: number) => onPatch({slides: moveItem(draft.slides, from, to)});

    return (
        <>
            {draft.type === 'VIDEO' && (
                <div className="space-y-3 rounded-panel border border-border p-3">
                    <div className="inline-flex rounded-control border border-border p-0.5" role="group" aria-label="Nguồn video">
                        {([['FILE', 'Tải tệp lên', Upload], ['LINK', 'Dán liên kết', Link2]] as const).map(([source, label, Icon]) => (
                            <Button
                                key={source}
                                type="button"
                                variant={draft.videoSource === source ? 'secondary' : 'ghost'}
                                size="sm"
                                aria-pressed={draft.videoSource === source}
                                disabled={uploading}
                                onClick={() => onPatch({videoSource: source})}
                                className="h-7 px-2.5 text-xs"
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </Button>
                        ))}
                    </div>
                    {draft.videoSource === 'FILE' ? (
                        <div className="space-y-2">
                            {draft.videoAssetId !== null && (
                                <p className="flex items-center gap-1.5 text-foreground">
                                    <Video className="h-3.5 w-3.5 text-muted" />
                                    {draft.videoFileName ?? `Tệp #${draft.videoAssetId}`}
                                </p>
                            )}
                            <TrainingAssetUpload
                                kind="video"
                                label={draft.videoAssetId !== null ? 'Thay tệp video' : 'Chọn tệp video'}
                                onBusyChange={onUploadBusy}
                                onUploaded={(asset, file) => onPatch({videoAssetId: asset.assetId, videoFileName: file.name})}
                            />
                        </div>
                    ) : (
                        <FormField label="Liên kết YouTube hoặc Vimeo" error={fieldErrors?.videoUrl}>
                            <Input
                                type="url"
                                value={draft.videoUrl}
                                placeholder="https://youtu.be/…"
                                aria-invalid={Boolean(fieldErrors?.videoUrl)}
                                onChange={event => onPatch({videoUrl: event.target.value})}
                                className="text-xs"
                            />
                        </FormField>
                    )}
                </div>
            )}

            {draft.type === 'SLIDES' && (
                <div className="space-y-3 rounded-panel border border-border p-3">
                    <TrainingAssetUpload
                        kind="image"
                        multiple
                        label="Thêm ảnh slide"
                        icon={<ImagePlus className="h-3.5 w-3.5" />}
                        onBusyChange={onUploadBusy}
                        onUploaded={(asset, file) => {
                            const previewUrl = URL.createObjectURL(file);
                            objectUrlsRef.current.push(previewUrl);
                            onUpdateDraft(current => ({
                                ...current,
                                slides: [...current.slides, {key: `new-${asset.assetId}`, assetId: asset.assetId, caption: '', previewUrl}],
                            }));
                        }}
                    />
                    {draft.slides.length === 0 ? (
                        <p className="text-muted-foreground">Chưa có slide. Có thể chọn nhiều ảnh một lần.</p>
                    ) : (
                        <ol className="space-y-2">
                            {draft.slides.map((slide, index) => (
                                <li key={slide.key} className="flex items-center gap-2">
                                    <span className="w-5 shrink-0 text-right text-muted-foreground tabular-nums">{index + 1}</span>
                                    <div className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-badge border border-border bg-slate-100">
                                        {slide.previewUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={slide.previewUrl} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground">#{slide.assetId}</span>
                                        )}
                                    </div>
                                    <Input
                                        value={slide.caption}
                                        placeholder="Chú thích"
                                        aria-label={`Chú thích slide ${index + 1}`}
                                        onChange={event =>
                                            onPatch({slides: draft.slides.map(item => (item.key === slide.key ? {...item, caption: event.target.value} : item))})
                                        }
                                        className="text-xs"
                                    />
                                    <Button type="button" variant="ghost" size="sm" className={iconBtnClass} disabled={index === 0} onClick={() => moveSlide(index, index - 1)} aria-label="Lên trên">
                                        <ArrowUp className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" className={iconBtnClass} disabled={index === draft.slides.length - 1} onClick={() => moveSlide(index, index + 1)} aria-label="Xuống dưới">
                                        <ArrowDown className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" className={iconBtnClass} onClick={() => onPatch({slides: draft.slides.filter(item => item.key !== slide.key)})} aria-label="Bỏ slide">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            )}

            {draft.type === 'ARTICLE' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                            Nội dung (Markdown: ### tiêu đề, - danh sách, | bảng |) <RequiredMark />
                        </span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setArticlePreview(value => !value)} className="h-6 px-2 text-[11px]">
                            {articlePreview ? 'Sửa' : 'Xem trước'}
                        </Button>
                    </div>
                    {articlePreview ? (
                        <div className="max-h-80 overflow-y-auto rounded-panel border border-border p-4">
                            <MarkdownSopRenderer markdown={draft.bodyMarkdown} />
                        </div>
                    ) : (
                        <Textarea
                            rows={12}
                            className="font-mono text-xs"
                            value={draft.bodyMarkdown}
                            onChange={event => onPatch({bodyMarkdown: event.target.value})}
                            aria-label="Nội dung bài đọc"
                        />
                    )}
                </div>
            )}

            {draft.type === 'DOCUMENT' && (
                <div className="space-y-3 rounded-panel border border-border p-3">
                    <div className="inline-flex rounded-control border border-border p-0.5" role="group" aria-label="Nguồn tài liệu">
                        {([['FILE', 'Tải PDF lên', FileUp], ['LINK', 'Dán liên kết Google', Link2]] as const).map(([source, label, Icon]) => (
                            <Button
                                key={source}
                                type="button"
                                variant={draft.documentSource === source ? 'secondary' : 'ghost'}
                                size="sm"
                                aria-pressed={draft.documentSource === source}
                                disabled={uploading}
                                onClick={() => onPatch({documentSource: source})}
                                className="h-7 px-2.5 text-xs"
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </Button>
                        ))}
                    </div>
                    {draft.documentSource === 'FILE' ? (
                        <div className="space-y-2">
                            {draft.documentAssetId !== null && (
                                <p className="flex items-center gap-1.5 text-foreground">
                                    <FileText className="h-3.5 w-3.5 text-muted" />
                                    {draft.documentFileName ?? `Tệp #${draft.documentAssetId}`}
                                </p>
                            )}
                            <TrainingAssetUpload
                                kind="pdf"
                                label={draft.documentAssetId !== null ? 'Thay tệp PDF' : 'Chọn tệp PDF'}
                                icon={<FileUp className="h-3.5 w-3.5" />}
                                onBusyChange={onUploadBusy}
                                onUploaded={(asset, file) => onPatch({documentAssetId: asset.assetId, documentFileName: file.name})}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Học viên đọc PDF từng trang ngay trong trình phát, có nút mở tab mới và tải xuống.
                            </p>
                        </div>
                    ) : (
                        <FormField
                            label="Liên kết Google Docs, Slides, Sheets hoặc Drive"
                            error={fieldErrors?.documentUrl}
                        >
                            <Input
                                type="url"
                                value={draft.documentUrl}
                                placeholder="https://docs.google.com/document/d/…"
                                aria-invalid={Boolean(fieldErrors?.documentUrl)}
                                onChange={event => onPatch({documentUrl: event.target.value})}
                                className="text-xs"
                            />
                            {!fieldErrors?.documentUrl && (
                                <span className="mt-1 block text-[11px] text-muted-foreground">
                                    Chia sẻ tài liệu ở chế độ “Bất kỳ ai có đường liên kết đều xem được” để học viên mở được.
                                </span>
                            )}
                        </FormField>
                    )}
                </div>
            )}

            <TrainingLessonAttachmentsEditor
                resources={draft.resources}
                attempted={attempted}
                onUploadBusy={onUploadBusy}
                onPatchResources={resources => onPatch({resources})}
                onAppendResource={entry =>
                    onUpdateDraft(current => ({...current, resources: [...current.resources, entry]}))
                }
            />
        </>
    );
}
