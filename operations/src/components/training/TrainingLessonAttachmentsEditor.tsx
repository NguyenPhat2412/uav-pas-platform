'use client';

import {ArrowDown, ArrowUp, Paperclip, Trash2} from 'lucide-react';
import {Button, Input} from '@/components/ui';
import {OptionalMark} from '@/components/shared/RequiredMark';
import type {TrainingLessonDraft} from '@/forms/training/training-form';
import {TrainingAssetUpload} from '@/components/training/TrainingAssetUpload';
import {RESOURCE_ICONS} from '@/components/training/TrainingLessonViewers';
import {
    defaultResourceTitle,
    formatFileSize,
    moveItem,
    resourceFileKind,
} from '@/utils/training/course-helpers';

const iconBtnClass = 'h-7 w-7 shrink-0 px-0';

export function TrainingLessonAttachmentsEditor({
    resources,
    attempted,
    onUploadBusy,
    onPatchResources,
    onAppendResource,
}: {
    resources: TrainingLessonDraft['resources'];
    attempted: boolean;
    onUploadBusy: (busy: boolean) => void;
    onPatchResources: (next: TrainingLessonDraft['resources']) => void;
    onAppendResource: (entry: TrainingLessonDraft['resources'][number]) => void;
}) {
    const moveResource = (from: number, to: number) => onPatchResources(moveItem(resources, from, to));

    return (
        <div className="space-y-3 rounded-panel border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Paperclip className="h-3.5 w-3.5 text-muted" />
                    Tài liệu đính kèm <OptionalMark />
                </p>
                <span className="text-[11px] text-muted-foreground">Học viên tải về từ tab “Tài liệu” và danh sách bài.</span>
            </div>
            <TrainingAssetUpload
                kind="resource"
                multiple
                label="Thêm tài liệu"
                icon={<Paperclip className="h-3.5 w-3.5" />}
                onBusyChange={onUploadBusy}
                onUploaded={(asset, file) =>
                    onAppendResource({
                        key: `new-${asset.assetId}`,
                        assetId: asset.assetId,
                        title: defaultResourceTitle(file.name),
                        contentType: asset.contentType || file.type,
                        size: asset.size || file.size,
                    })
                }
            />
            {resources.length > 0 && (
                <ol className="space-y-2">
                    {resources.map((resource, index) => {
                        const Icon = RESOURCE_ICONS[resourceFileKind(resource.contentType)];
                        const size = formatFileSize(resource.size);
                        return (
                            <li key={resource.key} className="flex items-center gap-2">
                                <span className="w-5 shrink-0 text-right text-muted-foreground tabular-nums">{index + 1}</span>
                                <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                                <Input
                                    value={resource.title}
                                    placeholder="Tên hiển thị"
                                    aria-label={`Tên tài liệu ${index + 1}`}
                                    aria-invalid={attempted && !resource.title.trim()}
                                    onChange={event =>
                                        onPatchResources(
                                            resources.map(item =>
                                                item.key === resource.key ? {...item, title: event.target.value} : item,
                                            ),
                                        )
                                    }
                                    className="text-xs"
                                />
                                {size && (
                                    <span className="hidden w-16 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums sm:inline">
                                        {size}
                                    </span>
                                )}
                                <Button type="button" variant="ghost" size="sm" className={iconBtnClass} disabled={index === 0} onClick={() => moveResource(index, index - 1)} aria-label="Lên trên">
                                    <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button type="button" variant="ghost" size="sm" className={iconBtnClass} disabled={index === resources.length - 1} onClick={() => moveResource(index, index + 1)} aria-label="Xuống dưới">
                                    <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button type="button" variant="ghost" size="sm" className={iconBtnClass} onClick={() => onPatchResources(resources.filter(item => item.key !== resource.key))} aria-label="Bỏ tài liệu">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}
