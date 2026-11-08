'use client';

import {useEffect, useRef, useState} from 'react';
import {Files, Upload} from 'lucide-react';
import {Button, Card, FormField, Input} from '@/components/ui';
import {useTrainingUploads} from '@/hooks/training/useTraining';
import {
    planBulkLessons,
    trainingFileContentType,
} from '@/utils/training/course-helpers';
import type {BulkRejectReason} from '@/utils/training/course-helpers';
import {
    BULK_ACCEPT,
    BULK_REJECT_MESSAGES,
    bulkErrorText,
    bulkKey,
    readVideoMinutes,
    TrainingBulkLessonQueueList,
    type BulkFile,
    type BulkLesson,
} from '@/components/training/TrainingBulkLessonQueueList';

/**
 * Drop (or pick) many files at once: each video becomes a VIDEO lesson and each PDF a DOCUMENT
 * lesson titled from its file name, and the images dropped together one SLIDES lesson.
 */
export function TrainingBulkLessonUpload({
    courseId,
    nextSortOrder,
    lastSection,
    onCreated,
}: {
    courseId: number;
    nextSortOrder: number;
    lastSection: string;
    onCreated: () => void;
}) {
    const {uploadAsset, createLesson} = useTrainingUploads();
    const inputRef = useRef<HTMLInputElement>(null);
    const [items, setItems] = useState<BulkLesson[]>([]);
    const [rejected, setRejected] = useState<Array<{key: string; name: string; reason: BulkRejectReason}>>([]);
    const [section, setSection] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [dragging, setDragging] = useState(false);
    const sectionTitle = section ?? lastSection;
    const pending = items.filter(item => item.status !== 'done');

    // Leaving the page mid-upload would lose the files that are not in yet.
    useEffect(() => {
        if (!running) return;
        const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [running]);

    const addFiles = (files: File[]) => {
        if (running || files.length === 0) return;
        const plan = planBulkLessons(files);
        setItems(current => [
            ...current.filter(item => item.status !== 'done'),
            ...plan.lessons.map(lesson => ({
                key: bulkKey(),
                type: lesson.type,
                title: lesson.title,
                files: lesson.files.map(file => ({key: bulkKey(), file, fraction: 0, assetId: null, error: null})),
                status: 'waiting' as const,
                error: null,
            })),
        ]);
        setRejected(plan.rejected.map(({file, reason}) => ({key: bulkKey(), name: file.name, reason})));
    };

    const patchItem = (key: string, patch: Partial<BulkLesson>) =>
        setItems(current => current.map(item => (item.key === key ? {...item, ...patch} : item)));
    const patchFile = (itemKey: string, fileKey: string, patch: Partial<BulkFile>) =>
        setItems(current =>
            current.map(item =>
                item.key !== itemKey
                    ? item
                    : {...item, files: item.files.map(entry => (entry.key === fileKey ? {...entry, ...patch} : entry))},
            ),
        );

    const run = async () => {
        if (running || pending.length === 0) return;
        setRunning(true);
        let sortOrder = nextSortOrder;
        let created = 0;
        for (const item of pending) {
            if (!item.title.trim()) {
                patchItem(item.key, {status: 'error', error: 'Nhập tên bài.'});
                continue;
            }
            patchItem(item.key, {status: 'uploading', error: null});
            const assetIds: number[] = [];
            let failed = false;
            for (const entry of item.files) {
                if (entry.assetId !== null) {
                    assetIds.push(entry.assetId);
                    continue;
                }
                patchFile(item.key, entry.key, {error: null, fraction: 0});
                try {
                    const asset = await uploadAsset(
                        entry.file,
                        fraction => patchFile(item.key, entry.key, {fraction}),
                        undefined,
                        trainingFileContentType(entry.file),
                    );
                    patchFile(item.key, entry.key, {assetId: asset.assetId, fraction: 1});
                    assetIds.push(asset.assetId);
                } catch (cause) {
                    patchFile(item.key, entry.key, {error: bulkErrorText(cause)});
                    failed = true;
                    break;
                }
            }
            if (failed) {
                patchItem(item.key, {status: 'error', error: 'Có tệp chưa tải lên được.'});
                continue;
            }
            patchItem(item.key, {status: 'saving'});
            try {
                const durationMinutes =
                    item.type === 'VIDEO'
                        ? await readVideoMinutes(item.files[0].file)
                        : item.type === 'SLIDES'
                          ? Math.max(1, Math.ceil(assetIds.length / 2))
                          : 5;
                await createLesson({
                    courseId,
                    sectionTitle: sectionTitle.trim(),
                    title: item.title.trim(),
                    type: item.type,
                    sortOrder,
                    durationMinutes,
                    active: true,
                    videoUrl: null,
                    videoAssetId: item.type === 'VIDEO' ? assetIds[0] : null,
                    bodyMarkdown: null,
                    slides: item.type === 'SLIDES' ? assetIds.map(assetId => ({assetId, caption: ''})) : [],
                    documentAssetId: item.type === 'DOCUMENT' ? assetIds[0] : null,
                    documentUrl: null,
                    resources: [],
                });
                sortOrder += 10;
                created += 1;
                patchItem(item.key, {status: 'done'});
            } catch (cause) {
                patchItem(item.key, {status: 'error', error: bulkErrorText(cause)});
            }
        }
        setRunning(false);
        if (created > 0) onCreated();
    };

    return (
        <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Files className="h-4 w-4 text-muted" aria-hidden />
                    Thêm nhiều bài từ tệp
                </h3>
                <span className="text-[11px] text-muted-foreground">
                    Mỗi video, mỗi PDF thành một bài; các ảnh thả cùng lúc thành một bài slide.
                </span>
            </div>

            <div
                onDragOver={event => {
                    event.preventDefault();
                    if (!running) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={event => {
                    event.preventDefault();
                    setDragging(false);
                    addFiles(Array.from(event.dataTransfer.files ?? []));
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-panel border-2 border-dashed px-4 py-6 text-center text-xs ${
                    dragging ? 'border-foreground/50 bg-slate-100' : 'border-border bg-slate-50'
                } ${running ? 'opacity-60' : ''}`}
            >
                <Upload className="h-5 w-5 text-slate-400" aria-hidden />
                <p className="text-foreground">Kéo thả video, PDF hoặc ảnh slide vào đây</p>
                <Button type="button" variant="outline" size="sm" disabled={running} onClick={() => inputRef.current?.click()}>
                    Chọn tệp
                </Button>
                <span className="text-[11px] text-muted-foreground">
                    Video MP4/WebM tối đa 500 MB · PDF tối đa 50 MB · ảnh PNG/JPEG/WebP tối đa 10 MB
                </span>
                <input
                    ref={inputRef}
                    type="file"
                    hidden
                    multiple
                    accept={BULK_ACCEPT}
                    onChange={event => {
                        const files = Array.from(event.target.files ?? []);
                        event.target.value = '';
                        addFiles(files);
                    }}
                />
            </div>

            {rejected.length > 0 && (
                <ul className="space-y-1 text-[11px] text-danger" role="alert">
                    {rejected.map(entry => <li key={entry.key}>{entry.name}: {BULK_REJECT_MESSAGES[entry.reason]}</li>)}
                </ul>
            )}

            {items.length > 0 && (
                <div className="space-y-3 text-xs">
                    <FormField label="Chương cho các bài mới" className="max-w-sm">
                        <Input
                            value={sectionTitle}
                            placeholder="Nội dung"
                            disabled={running}
                            onChange={event => setSection(event.target.value)}
                            className="text-xs"
                        />
                    </FormField>

                    <TrainingBulkLessonQueueList
                        items={items}
                        running={running}
                        onRenameItem={(key, title) => patchItem(key, {title})}
                        onRemoveItem={key => setItems(current => current.filter(entry => entry.key !== key))}
                    />

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={running}
                            onClick={() => {
                                setItems([]);
                                setRejected([]);
                            }}
                        >
                            {pending.length === 0 ? 'Xong' : 'Bỏ danh sách'}
                        </Button>
                        {pending.length > 0 && (
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                isLoading={running}
                                disabled={running}
                                onClick={() => void run()}
                                className="bg-slate-800 text-white hover:bg-slate-700"
                            >
                                {running ? 'Đang tải lên…' : `Tải lên và tạo ${pending.length} bài`}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}
