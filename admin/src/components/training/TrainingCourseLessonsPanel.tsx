'use client';

import {useState} from 'react';
import Link from 'next/link';
import {
    ArrowDown,
    ArrowUp,
    Eye,
    EyeOff,
    FileText,
    ImagePlus,
    Pencil,
    Plus,
    X,
} from 'lucide-react';
import {Button, Card} from '@/components/ui';
import {
    useAdminTrainingLessons,
    useRefreshTrainingCourse,
    useSetTrainingCover,
    useTrainingCourses,
    useUpdateTrainingLessons,
} from '@/hooks/training/useTraining';
import {confirmDialog} from '@/providers/ConfirmContext';
import {useI18n} from '@/providers/I18nContext';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import type {
    AdminTrainingLesson,
    TrainingDocument,
    TrainingPortalTier,
} from '@/types/training/training.types';
import {lessonPayloadFromDetail} from '@/forms/training/training-form';
import {TrainingAssetUpload} from '@/components/training/TrainingAssetUpload';
import {TrainingBulkLessonUpload} from '@/components/training/TrainingBulkLessonUpload';
import {
    TRAINING_LESSON_TYPE_ICONS,
    TrainingLessonEditorModal,
} from '@/components/training/TrainingLessonEditorModal';
import {adminTrainingPreviewHref} from '@/utils/training/training-meta';
import {
    LESSON_TYPE_LABELS,
    moveItem,
    respacedSortOrders,
} from '@/utils/training/course-helpers';

const iconBtnClass = 'h-7 w-7 px-0';

/**
 * Admin side of a course: its cover image, a link to the learner view, the lesson list with add,
 * edit, reorder (sort order + up/down) and hide/show, and a drop area that turns files into lessons.
 */
export function TrainingCourseAdminPanel({
    document,
    portal,
}: {
    document: TrainingDocument;
    portal: TrainingPortalTier;
}) {
    const {t} = useI18n();
    const [editing, setEditing] = useState<AdminTrainingLesson | 'new' | null>(null);
    const lessonsQuery = useAdminTrainingLessons(document.id);
    const coursesQuery = useTrainingCourses(portal);
    const summary = coursesQuery.data?.find(course => course.id === document.id);

    // The catalogue lists active courses only, so a hidden course is not in it: prefer the cover the
    // server just returned, then the document's own, then the catalogue's. `undefined` = not known.
    const [savedCover, setSavedCover] = useState<string | null | undefined>(undefined);
    const coverUrl =
        savedCover !== undefined
            ? savedCover
            : document.coverUrl !== undefined
              ? document.coverUrl
              : summary?.coverUrl;

    const lessons = [...(lessonsQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

    const refresh = useRefreshTrainingCourse(document.id);
    const reorder = useUpdateTrainingLessons(document.id);

    // Only the lessons whose sort order changes are saved, one after another.
    const moveLesson = (from: number, to: number) => {
        const moved = moveItem(lessons, from, to);
        const orders = respacedSortOrders(moved.length);
        reorder.mutate(
            moved.flatMap((lesson, index) =>
                lesson.sortOrder !== orders[index]
                    ? [{id: lesson.id, payload: lessonPayloadFromDetail(lesson, {sortOrder: orders[index]})}]
                    : [],
            ),
        );
    };

    const toggleActive = useUpdateTrainingLessons(document.id);
    const cover = useSetTrainingCover(document.id, portal, {
        // The server answers with the course summary: show the new cover at once, then refresh the lists.
        onSuccess: (saved, assetId) => {
            setSavedCover(saved ? saved.coverUrl ?? null : assetId === null ? null : undefined);
        },
    });

    const busy = reorder.isPending || toggleActive.isPending;
    const actionError = reorder.error ?? toggleActive.error ?? cover.error;
    const nextSortOrder = (lessons.at(-1)?.sortOrder ?? 0) + 10;
    const lastSection = lessons.at(-1)?.sectionTitle ?? '';

    return (
        <div className="space-y-4 bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="aspect-video w-full shrink-0 overflow-hidden rounded-panel border border-border bg-surface-variant sm:w-44">
                    {coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverUrl} alt="Ảnh bìa khóa học" className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full items-center justify-center px-3 text-center text-[11px] text-muted-foreground">
                            {coverUrl === undefined && !document.active
                                ? 'Khóa học đang ẩn: ảnh bìa hiện sau khi tải ảnh mới'
                                : 'Chưa có ảnh bìa'}
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <TrainingAssetUpload
                            kind="image"
                            label={coverUrl ? 'Đổi ảnh bìa' : 'Tải ảnh bìa'}
                            icon={<ImagePlus className="h-3.5 w-3.5" />}
                            disabled={cover.isPending}
                            onUploaded={asset => cover.mutate(asset.assetId)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {coverUrl && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={cover.isPending}
                                onClick={() => cover.mutate(null)}
                            >
                                <X className="h-3.5 w-3.5" />
                                Gỡ ảnh bìa
                            </Button>
                        )}
                        <Link
                            href={adminTrainingPreviewHref(document.slug || document.code, portal)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-surface-variant"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            Xem như học viên
                        </Link>
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden p-0">
                <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-variant/60 px-4 py-2">
                    <h3 className="text-sm font-semibold text-foreground">
                        Bài học{lessonsQuery.data && ` (${lessons.length})`}
                    </h3>
                    <Button type="button" variant="primary" size="sm" onClick={() => setEditing('new')} className="h-7 px-2.5 text-xs">
                        <Plus className="h-3.5 w-3.5" />
                        Thêm bài học
                    </Button>
                </div>
                {lessonsQuery.error ? (
                    <div className="p-4"><ErrorNotice error={lessonsQuery.error} /></div>
                ) : lessonsQuery.isPending ? (
                    <div className="space-y-2 p-4">
                        {[0, 1].map(index => <div key={index} className="h-9 animate-pulse rounded-badge bg-surface-variant" />)}
                    </div>
                ) : lessons.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                        Chưa có bài học. Kéo thả video, PDF hoặc ảnh slide vào ô bên dưới, hoặc bấm “Thêm bài học”.
                    </p>
                ) : (
                    <ol className="divide-y divide-border">
                        {lessons.map((lesson, index) => {
                            const Icon = TRAINING_LESSON_TYPE_ICONS[lesson.type] ?? FileText;
                            return (
                                <li key={lesson.id} className={`flex items-center gap-3 px-4 py-2 ${lesson.active ? '' : 'bg-surface-variant/40'}`}>
                                    <span className="w-8 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums" title="Thứ tự">
                                        {lesson.sortOrder}
                                    </span>
                                    <Icon className="h-4 w-4 shrink-0 text-muted" aria-label={LESSON_TYPE_LABELS[lesson.type]} />
                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate text-sm ${lesson.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                                            {lesson.title}
                                        </p>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            {lesson.sectionTitle?.trim() || 'Nội dung'} · {LESSON_TYPE_LABELS[lesson.type]} · {lesson.durationMinutes} phút
                                            {(lesson.resources?.length ?? 0) > 0 && ` · ${lesson.resources?.length} tài liệu đính kèm`}
                                            {!lesson.active && ' · Đang ẩn'}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center">
                                        <Button type="button" variant="ghost" size="sm" className={iconBtnClass} disabled={busy || index === 0} onClick={() => moveLesson(index, index - 1)} aria-label="Lên trên" title="Lên trên">
                                            <ArrowUp className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" className={iconBtnClass} disabled={busy || index === lessons.length - 1} onClick={() => moveLesson(index, index + 1)} aria-label="Xuống dưới" title="Xuống dưới">
                                            <ArrowDown className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" className={iconBtnClass} disabled={busy} onClick={() => setEditing(lesson)} aria-label="Sửa bài" title="Sửa bài">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        {/* Lessons are never deleted, only hidden from learners (and can be shown again). */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={iconBtnClass}
                                            disabled={busy}
                                            onClick={() =>
                                                void (async () => {
                                                    if (!lesson.active || (await confirmDialog(t('common.hideLessonConfirm', {title: lesson.title})))) {
                                                        toggleActive.mutate([{id: lesson.id, payload: lessonPayloadFromDetail(lesson, {active: !lesson.active})}]);
                                                    }
                                                })()
                                            }
                                            aria-label={lesson.active ? t('common.hideLesson') : t('common.showLesson')}
                                            title={lesson.active ? t('common.hideLesson') : t('common.showLesson')}
                                        >
                                            {lesson.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </Card>
            {actionError && <ErrorNotice error={actionError} />}

            <TrainingBulkLessonUpload
                courseId={document.id}
                nextSortOrder={nextSortOrder}
                lastSection={lastSection}
                onCreated={() => void refresh()}
            />

            {editing && (
                <TrainingLessonEditorModal
                    courseId={document.id}
                    lesson={editing === 'new' ? null : editing}
                    nextSortOrder={nextSortOrder}
                    lastSection={lastSection}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        void refresh();
                    }}
                />
            )}
        </div>
    );
}
