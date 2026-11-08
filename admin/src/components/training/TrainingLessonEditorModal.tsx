'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {BookOpen, FileText, Presentation, Video, X} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {Button, FormField, Input} from '@/components/ui';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {useSaveTrainingLesson} from '@/hooks/training/useTraining';
import type {AdminTrainingLesson, TrainingLessonType} from '@/types/training/training.types';
import {
    lessonDraftFromDetail,
    lessonDraftProblem,
    toUpsertTrainingLessonPayload,
    trainingLessonFieldErrors,
    type TrainingLessonDraft,
} from '@/forms/training/training-form';
import {TrainingLessonMediaFields} from '@/components/training/TrainingLessonMediaFields';
import {LESSON_TYPE_LABELS} from '@/utils/training/course-helpers';

export const TRAINING_LESSON_TYPE_ICONS: Record<TrainingLessonType, LucideIcon> = {
    VIDEO: Video,
    SLIDES: Presentation,
    ARTICLE: BookOpen,
    DOCUMENT: FileText,
};

export function TrainingLessonEditorModal({
    courseId,
    lesson,
    nextSortOrder,
    lastSection,
    onClose,
    onSaved,
}: {
    courseId: number;
    lesson: AdminTrainingLesson | null;
    nextSortOrder: number;
    lastSection: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const [draft, setDraft] = useState<TrainingLessonDraft>(() =>
        lessonDraftFromDetail(lesson, nextSortOrder, lastSection),
    );
    const [attempted, setAttempted] = useState(false);
    const [uploads, setUploads] = useState(0);
    const objectUrls = useRef<string[]>([]);
    const set = (patch: Partial<TrainingLessonDraft>) => setDraft(current => ({...current, ...patch}));

    // While a file is uploading the dialog cannot be closed or saved: the asset would be lost or missing.
    const uploading = uploads > 0;
    const onUploadBusy = useCallback(
        (busy: boolean) => setUploads(count => Math.max(0, count + (busy ? 1 : -1))),
        [],
    );

    // Local previews of freshly uploaded slides are released with the dialog.
    useEffect(() => {
        const urls = objectUrls.current;
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, []);

    const save = useSaveTrainingLesson(lesson?.id, {onSuccess: onSaved});
    const fieldErrors = trainingLessonFieldErrors(save.error);
    const locked = uploading || save.isPending;

    useDialogFocusTrap(dialogRef, true, locked ? undefined : onClose);

    const problem = lessonDraftProblem(draft);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="lesson-dialog-title"
                className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-overlay border border-border bg-card shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <h3 id="lesson-dialog-title" className="text-sm font-bold text-foreground">
                        {lesson ? 'Sửa bài học' : 'Thêm bài học'}
                    </h3>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        disabled={locked}
                        aria-label="Đóng"
                        title={uploading ? 'Đang tải tệp lên' : 'Đóng'}
                        className="h-7 w-7 px-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
                    <fieldset>
                        <legend className="mb-1.5 font-semibold text-foreground">Loại bài</legend>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {(Object.keys(TRAINING_LESSON_TYPE_ICONS) as TrainingLessonType[]).map(type => {
                                const Icon = TRAINING_LESSON_TYPE_ICONS[type];
                                const active = draft.type === type;
                                return (
                                    <Button
                                        key={type}
                                        type="button"
                                        variant={active ? 'secondary' : 'outline'}
                                        size="sm"
                                        aria-pressed={active}
                                        disabled={uploading}
                                        onClick={() => set({type})}
                                        className={`justify-center ${active ? 'border-foreground bg-slate-100 text-foreground' : ''}`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {LESSON_TYPE_LABELS[type]}
                                    </Button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField label="Tên bài" required error={fieldErrors?.title} className="sm:col-span-2">
                            <Input
                                value={draft.title}
                                onChange={event => set({title: event.target.value})}
                                aria-required
                                aria-invalid={Boolean(fieldErrors?.title)}
                                className="text-xs"
                            />
                        </FormField>
                        <FormField label="Chương" error={fieldErrors?.sectionTitle}>
                            <Input
                                value={draft.sectionTitle}
                                placeholder="Nội dung"
                                onChange={event => set({sectionTitle: event.target.value})}
                                aria-invalid={Boolean(fieldErrors?.sectionTitle)}
                                className="text-xs"
                            />
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Thời lượng (phút)" error={fieldErrors?.durationMinutes}>
                                <Input
                                    type="number"
                                    value={draft.durationMinutes}
                                    onChange={event => set({durationMinutes: Number(event.target.value)})}
                                    aria-invalid={Boolean(fieldErrors?.durationMinutes)}
                                    className="text-xs"
                                />
                            </FormField>
                            <FormField label="Thứ tự">
                                <Input
                                    type="number"
                                    value={draft.sortOrder}
                                    onChange={event => set({sortOrder: Number(event.target.value) || 0})}
                                    className="text-xs"
                                />
                            </FormField>
                        </div>
                    </div>

                    <TrainingLessonMediaFields
                        draft={draft}
                        onPatch={set}
                        onUpdateDraft={setDraft}
                        fieldErrors={fieldErrors}
                        attempted={attempted}
                        uploading={uploading}
                        onUploadBusy={onUploadBusy}
                        objectUrlsRef={objectUrls}
                    />

                    <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={draft.active}
                            onChange={event => set({active: event.target.checked})}
                            className="h-4 w-4 accent-slate-700"
                        />
                        <span className="font-medium text-foreground">Hiện cho học viên</span>
                    </label>

                    {save.error && <ErrorNotice error={save.error} />}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                    {uploading ? (
                        <span className="mr-auto text-[11px] text-muted" role="status">
                            Đang tải tệp lên. Chờ xong rồi mới lưu hoặc đóng.
                        </span>
                    ) : (
                        attempted && problem && <span className="mr-auto text-[11px] text-danger">{problem}</span>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={locked}>
                        Huỷ
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={save.isPending}
                        disabled={locked}
                        onClick={() => {
                            setAttempted(true);
                            if (!problem) save.mutate(toUpsertTrainingLessonPayload(draft, courseId));
                        }}
                    >
                        {save.isPending ? 'Đang lưu…' : lesson ? 'Lưu thay đổi' : 'Thêm bài'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
