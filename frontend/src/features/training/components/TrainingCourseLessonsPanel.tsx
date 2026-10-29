'use client';

import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
    ArrowDown,
    ArrowUp,
    BookOpen,
    Eye,
    EyeOff,
    FileIcon,
    FileText,
    FileUp,
    ImageIcon,
    ImagePlus,
    Link2,
    Paperclip,
    Pencil,
    Plus,
    Presentation,
    Trash2,
    Upload,
    Video,
    X,
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {trainingService} from '@/lib/api/resources';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import type {
    AdminTrainingLesson,
    TrainingCourseSummary,
    TrainingDocument,
    TrainingLessonType,
    TrainingPortalTier,
    UpsertTrainingLessonPayload,
} from '@/features/training/types/training.types';
import {TrainingAssetUpload} from '@/features/training/components/TrainingAssetUpload';
import {trainingCoursesQueryKey} from '@/features/training/components/TrainingCourseCatalog';
import {MarkdownSopRenderer} from '@/features/training/components/MarkdownSopRenderer';
import {adminTrainingPreviewHref} from '@/features/training/utils/training-meta';
import {
    defaultResourceTitle,
    formatFileSize,
    isSupportedVideoLink,
    LESSON_TYPE_LABELS,
    moveItem,
    resourceFileKind,
    respacedSortOrders,
} from '@/features/training/utils/course-helpers';

const lessonsQueryKey = (courseId: number) => ['uav-training-admin-lessons', courseId] as const;

const TYPE_ICONS: Record<TrainingLessonType, LucideIcon> = {VIDEO: Video, SLIDES: Presentation, ARTICLE: BookOpen, DOCUMENT: FileText};
const RESOURCE_ICONS = {pdf: FileText, image: ImageIcon, file: FileIcon} as const;

const inputClass = 'w-full rounded-control border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-foreground/40 focus:outline-none';
const ghostButton = 'inline-flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-surface-variant hover:text-foreground disabled:pointer-events-none disabled:opacity-30';

function lessonPayload(lesson: AdminTrainingLesson, overrides: Partial<UpsertTrainingLessonPayload> = {}): UpsertTrainingLessonPayload {
    return {
        courseId: lesson.courseId,
        sectionTitle: lesson.sectionTitle ?? '',
        title: lesson.title,
        type: lesson.type,
        sortOrder: lesson.sortOrder,
        durationMinutes: lesson.durationMinutes,
        active: lesson.active,
        videoUrl: lesson.videoUrl,
        videoAssetId: lesson.videoAssetId,
        bodyMarkdown: lesson.bodyMarkdown,
        slides: (lesson.slides ?? []).map(slide => ({assetId: slide.assetId, caption: slide.caption ?? ''})),
        documentAssetId: lesson.documentAssetId ?? null,
        // Re-send the attachments as listed; leave the key out if the listing did not carry them so they are not wiped.
        ...(lesson.resources ? {resources: lesson.resources.map(resource => ({assetId: resource.assetId, title: resource.title}))} : {}),
        ...overrides,
    };
}

/**
 * Admin side of a course: its cover image, a link to the learner view, and the lesson list with
 * add, edit, reorder (sort order + up/down), hide and delete.
 */
export function TrainingCourseAdminPanel({document, portal}: {document: TrainingDocument; portal: TrainingPortalTier}) {
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState<AdminTrainingLesson | 'new' | null>(null);
    const lessonsQuery = useQuery({
        queryKey: lessonsQueryKey(document.id),
        queryFn: ({signal}) => trainingService.adminListLessons(document.id, signal),
    });
    const coursesQuery = useQuery({
        queryKey: trainingCoursesQueryKey(portal),
        queryFn: ({signal}) => trainingService.listCourses(portal, signal),
    });
    const summary = coursesQuery.data?.find(course => course.id === document.id);
    const lessons = [...(lessonsQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

    const refresh = () => Promise.all([
        queryClient.invalidateQueries({queryKey: lessonsQueryKey(document.id)}),
        queryClient.invalidateQueries({queryKey: ['uav-training-courses']}),
        queryClient.invalidateQueries({queryKey: ['uav-training-course']}),
    ]);

    const reorder = useMutation({
        mutationFn: async ({from, to}: {from: number; to: number}) => {
            const moved = moveItem(lessons, from, to);
            const orders = respacedSortOrders(moved.length);
            for (const [index, lesson] of moved.entries()) {
                if (lesson.sortOrder !== orders[index]) {
                    await trainingService.adminUpdateLesson(lesson.id, lessonPayload(lesson, {sortOrder: orders[index]}));
                }
            }
        },
        onSettled: refresh,
    });
    const toggleActive = useMutation({
        mutationFn: (lesson: AdminTrainingLesson) => trainingService.adminUpdateLesson(lesson.id, lessonPayload(lesson, {active: !lesson.active})),
        onSettled: refresh,
    });
    const remove = useMutation({
        mutationFn: (lesson: AdminTrainingLesson) => trainingService.adminDeleteLesson(lesson.id),
        onSettled: refresh,
    });
    const cover = useMutation({
        mutationFn: (assetId: number | null) => trainingService.adminSetCover(document.id, assetId),
        // The server answers with the course summary: show the new cover at once, then refresh the lists.
        onSuccess: saved => {
            if (saved) {
                queryClient.setQueryData<TrainingCourseSummary[]>(trainingCoursesQueryKey(portal), list =>
                    list?.map(course => (course.id === saved.id ? {...course, ...saved} : course)));
            }
        },
        onSettled: () => queryClient.invalidateQueries({queryKey: ['uav-training-courses']}),
    });

    const busy = reorder.isPending || toggleActive.isPending || remove.isPending;
    const actionError = reorder.error ?? toggleActive.error ?? remove.error ?? cover.error;

    return (
        <div className="space-y-4 bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="aspect-video w-full shrink-0 overflow-hidden rounded-panel border border-border bg-surface-variant sm:w-44">
                    {summary?.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={summary.coverUrl} alt="Ảnh bìa khoá học" className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">Chưa có ảnh bìa</div>
                    )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <TrainingAssetUpload
                            kind="image"
                            label={summary?.coverUrl ? 'Đổi ảnh bìa' : 'Tải ảnh bìa'}
                            icon={<ImagePlus className="h-3.5 w-3.5" />}
                            disabled={cover.isPending}
                            onUploaded={asset => cover.mutate(asset.assetId)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {summary?.coverUrl && (
                            <button
                                type="button"
                                disabled={cover.isPending}
                                onClick={() => cover.mutate(null)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border bg-card px-3 text-xs font-medium text-muted hover:text-foreground disabled:opacity-50"
                            >
                                <X className="h-3.5 w-3.5" />
                                Gỡ ảnh bìa
                            </button>
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

            <div className="overflow-hidden rounded-panel border border-border">
                <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-variant/60 px-4 py-2">
                    <h3 className="text-sm font-semibold text-foreground">
                        Bài học{lessonsQuery.data && ` (${lessons.length})`}
                    </h3>
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="inline-flex h-7 items-center gap-1 rounded-control bg-primary px-2.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Thêm bài học
                    </button>
                </div>
                {lessonsQuery.error ? (
                    <div className="p-4"><ErrorNotice error={lessonsQuery.error} /></div>
                ) : lessonsQuery.isPending ? (
                    <div className="space-y-2 p-4">{[0, 1].map(index => <div key={index} className="h-9 animate-pulse rounded-badge bg-surface-variant" />)}</div>
                ) : lessons.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">Chưa có bài học. Thêm video, slide, bài đọc hoặc tài liệu PDF.</p>
                ) : (
                    <ol className="divide-y divide-border">
                        {lessons.map((lesson, index) => {
                            const Icon = TYPE_ICONS[lesson.type] ?? FileText;
                            return (
                                <li key={lesson.id} className={`flex items-center gap-3 px-4 py-2 ${lesson.active ? '' : 'bg-surface-variant/40'}`}>
                                    <span className="w-8 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums" title="Thứ tự">{lesson.sortOrder}</span>
                                    <Icon className="h-4 w-4 shrink-0 text-muted" aria-label={LESSON_TYPE_LABELS[lesson.type]} />
                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate text-sm ${lesson.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{lesson.title}</p>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            {lesson.sectionTitle?.trim() || 'Nội dung'} · {LESSON_TYPE_LABELS[lesson.type]} · {lesson.durationMinutes} phút
                                            {(lesson.resources?.length ?? 0) > 0 && ` · ${lesson.resources?.length} tài liệu đính kèm`}
                                            {!lesson.active && ' · Đang ẩn'}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center">
                                        <button type="button" className={ghostButton} disabled={busy || index === 0} onClick={() => reorder.mutate({from: index, to: index - 1})} aria-label="Lên trên" title="Lên trên">
                                            <ArrowUp className="h-3.5 w-3.5" />
                                        </button>
                                        <button type="button" className={ghostButton} disabled={busy || index === lessons.length - 1} onClick={() => reorder.mutate({from: index, to: index + 1})} aria-label="Xuống dưới" title="Xuống dưới">
                                            <ArrowDown className="h-3.5 w-3.5" />
                                        </button>
                                        <button type="button" className={ghostButton} disabled={busy} onClick={() => toggleActive.mutate(lesson)} aria-label={lesson.active ? 'Ẩn bài' : 'Hiện bài'} title={lesson.active ? 'Ẩn bài' : 'Hiện bài'}>
                                            {lesson.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </button>
                                        <button type="button" className={ghostButton} disabled={busy} onClick={() => setEditing(lesson)} aria-label="Sửa bài" title="Sửa bài">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            className={ghostButton}
                                            disabled={busy}
                                            onClick={() => {
                                                if (window.confirm(`Xoá bài "${lesson.title}"?`)) remove.mutate(lesson);
                                            }}
                                            aria-label="Xoá bài"
                                            title="Xoá bài"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
            {actionError && <ErrorNotice error={actionError} />}

            {editing && (
                <LessonDialog
                    courseId={document.id}
                    lesson={editing === 'new' ? null : editing}
                    nextSortOrder={(lessons.at(-1)?.sortOrder ?? 0) + 10}
                    lastSection={lessons.at(-1)?.sectionTitle ?? ''}
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

type SlideDraft = {key: string; assetId: number; caption: string; previewUrl: string | null};
type ResourceDraft = {key: string; assetId: number; title: string; contentType: string | null; size: number | null};

interface LessonDraft {
    sectionTitle: string;
    title: string;
    type: TrainingLessonType;
    sortOrder: number;
    durationMinutes: number;
    active: boolean;
    videoSource: 'FILE' | 'LINK';
    videoUrl: string;
    videoAssetId: number | null;
    videoFileName: string | null;
    bodyMarkdown: string;
    slides: SlideDraft[];
    documentAssetId: number | null;
    documentFileName: string | null;
    resources: ResourceDraft[];
}

function draftFrom(lesson: AdminTrainingLesson | null, sortOrder: number, sectionTitle: string): LessonDraft {
    if (!lesson) {
        return {
            sectionTitle, title: '', type: 'VIDEO', sortOrder, durationMinutes: 5, active: true,
            videoSource: 'FILE', videoUrl: '', videoAssetId: null, videoFileName: null, bodyMarkdown: '', slides: [],
            documentAssetId: null, documentFileName: null, resources: [],
        };
    }
    return {
        sectionTitle: lesson.sectionTitle ?? '',
        title: lesson.title,
        type: lesson.type,
        sortOrder: lesson.sortOrder,
        durationMinutes: lesson.durationMinutes,
        active: lesson.active,
        videoSource: lesson.videoUrl ? 'LINK' : 'FILE',
        videoUrl: lesson.videoUrl ?? '',
        videoAssetId: lesson.videoAssetId,
        videoFileName: lesson.videoAssetId ? `Tệp đã tải lên #${lesson.videoAssetId}` : null,
        bodyMarkdown: lesson.bodyMarkdown ?? '',
        slides: (lesson.slides ?? []).map((slide, index) => ({
            key: `existing-${slide.assetId}-${index}`,
            assetId: slide.assetId,
            caption: slide.caption ?? '',
            previewUrl: slide.url ?? null,
        })),
        documentAssetId: lesson.documentAssetId ?? null,
        documentFileName: lesson.document?.fileName ?? (lesson.documentAssetId ? `Tệp PDF đã tải lên #${lesson.documentAssetId}` : null),
        resources: (lesson.resources ?? []).map((resource, index) => ({
            key: `existing-${resource.assetId}-${index}`,
            assetId: resource.assetId,
            title: resource.title ?? '',
            contentType: resource.contentType ?? null,
            size: resource.size ?? null,
        })),
    };
}

/** What still blocks saving, in the order the form shows it; null when the draft is complete. */
function draftProblem(draft: LessonDraft): string | null {
    if (!draft.title.trim()) return 'Nhập tên bài học.';
    if (!Number.isFinite(draft.durationMinutes) || draft.durationMinutes < 0) return 'Thời lượng không hợp lệ.';
    if (draft.type === 'VIDEO') {
        if (draft.videoSource === 'LINK' && !isSupportedVideoLink(draft.videoUrl)) return 'Dán liên kết YouTube hoặc Vimeo.';
        if (draft.videoSource === 'FILE' && draft.videoAssetId === null) return 'Tải tệp video lên trước khi lưu.';
    }
    if (draft.type === 'SLIDES' && draft.slides.length === 0) return 'Thêm ít nhất một ảnh slide.';
    if (draft.type === 'ARTICLE' && !draft.bodyMarkdown.trim()) return 'Nhập nội dung bài đọc.';
    if (draft.type === 'DOCUMENT' && draft.documentAssetId === null) return 'Tải tệp PDF lên trước khi lưu.';
    if (draft.resources.some(resource => !resource.title.trim())) return 'Đặt tên cho mọi tài liệu đính kèm.';
    return null;
}

function payloadFrom(draft: LessonDraft, courseId: number): UpsertTrainingLessonPayload {
    const isVideo = draft.type === 'VIDEO';
    return {
        courseId,
        sectionTitle: draft.sectionTitle.trim(),
        title: draft.title.trim(),
        type: draft.type,
        sortOrder: draft.sortOrder,
        durationMinutes: Math.round(draft.durationMinutes),
        active: draft.active,
        videoUrl: isVideo && draft.videoSource === 'LINK' ? draft.videoUrl.trim() : null,
        videoAssetId: isVideo && draft.videoSource === 'FILE' ? draft.videoAssetId : null,
        // An article's body is the lesson; for other types it is optional notes shown under "Tổng quan".
        bodyMarkdown: draft.type === 'ARTICLE' ? draft.bodyMarkdown : draft.bodyMarkdown.trim() || null,
        slides: draft.type === 'SLIDES' ? draft.slides.map(slide => ({assetId: slide.assetId, caption: slide.caption.trim()})) : [],
        documentAssetId: draft.type === 'DOCUMENT' ? draft.documentAssetId : null,
        resources: draft.resources.map(resource => ({assetId: resource.assetId, title: resource.title.trim()})),
    };
}

function LessonDialog({courseId, lesson, nextSortOrder, lastSection, onClose, onSaved}: {
    courseId: number;
    lesson: AdminTrainingLesson | null;
    nextSortOrder: number;
    lastSection: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [draft, setDraft] = useState<LessonDraft>(() => draftFrom(lesson, nextSortOrder, lastSection));
    const [articlePreview, setArticlePreview] = useState(false);
    const [attempted, setAttempted] = useState(false);
    const objectUrls = useRef<string[]>([]);
    const set = (patch: Partial<LessonDraft>) => setDraft(current => ({...current, ...patch}));

    // Local previews of freshly uploaded slides are released with the dialog.
    useEffect(() => {
        const urls = objectUrls.current;
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, []);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const save = useMutation({
        mutationFn: (payload: UpsertTrainingLessonPayload) =>
            lesson ? trainingService.adminUpdateLesson(lesson.id, payload) : trainingService.adminCreateLesson(payload),
        onSuccess: onSaved,
    });

    const problem = draftProblem(draft);
    const moveSlide = (from: number, to: number) => set({slides: moveItem(draft.slides, from, to)});
    const moveResource = (from: number, to: number) => set({resources: moveItem(draft.resources, from, to)});

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="lesson-dialog-title">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-overlay border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <h3 id="lesson-dialog-title" className="text-sm font-bold text-foreground">{lesson ? 'Sửa bài học' : 'Thêm bài học'}</h3>
                    <button type="button" onClick={onClose} aria-label="Đóng" className={ghostButton}>
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
                    <fieldset>
                        <legend className="mb-1.5 font-semibold text-foreground">Loại bài</legend>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {(Object.keys(TYPE_ICONS) as TrainingLessonType[]).map(type => {
                                const Icon = TYPE_ICONS[type];
                                const active = draft.type === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => set({type})}
                                        className={`flex items-center justify-center gap-1.5 rounded-control border px-3 py-2 font-medium ${
                                            active ? 'border-foreground bg-slate-100 text-foreground' : 'border-border text-muted hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {LESSON_TYPE_LABELS[type]}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                            <span className="mb-1 block font-semibold text-foreground">Tên bài <RequiredMark /></span>
                            <input className={inputClass} value={draft.title} onChange={event => set({title: event.target.value})} aria-required />
                        </label>
                        <label className="block">
                            <span className="mb-1 block font-semibold text-foreground">Chương <OptionalMark /></span>
                            <input className={inputClass} value={draft.sectionTitle} placeholder="Nội dung" onChange={event => set({sectionTitle: event.target.value})} />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className="mb-1 block font-semibold text-foreground">Thời lượng (phút)</span>
                                <input type="number" min={0} className={inputClass} value={draft.durationMinutes} onChange={event => set({durationMinutes: Number(event.target.value)})} />
                            </label>
                            <label className="block">
                                <span className="mb-1 block font-semibold text-foreground">Thứ tự</span>
                                <input type="number" className={inputClass} value={draft.sortOrder} onChange={event => set({sortOrder: Number(event.target.value) || 0})} />
                            </label>
                        </div>
                    </div>

                    {draft.type === 'VIDEO' && (
                        <div className="space-y-3 rounded-panel border border-border p-3">
                            <div className="inline-flex rounded-control border border-border p-0.5" role="group" aria-label="Nguồn video">
                                {([['FILE', 'Tải tệp lên', Upload], ['LINK', 'Dán liên kết', Link2]] as const).map(([source, label, Icon]) => (
                                    <button
                                        key={source}
                                        type="button"
                                        aria-pressed={draft.videoSource === source}
                                        onClick={() => set({videoSource: source})}
                                        className={`inline-flex items-center gap-1 rounded-control px-2.5 py-1 font-medium ${
                                            draft.videoSource === source ? 'bg-slate-100 text-foreground' : 'text-muted hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {label}
                                    </button>
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
                                        onUploaded={(asset, file) => set({videoAssetId: asset.assetId, videoFileName: file.name})}
                                    />
                                </div>
                            ) : (
                                <label className="block">
                                    <span className="mb-1 block font-semibold text-foreground">Liên kết YouTube hoặc Vimeo</span>
                                    <input
                                        type="url"
                                        className={inputClass}
                                        value={draft.videoUrl}
                                        placeholder="https://youtu.be/…"
                                        onChange={event => set({videoUrl: event.target.value})}
                                    />
                                    {draft.videoUrl.trim() && !isSupportedVideoLink(draft.videoUrl) && (
                                        <span className="mt-1 block text-[11px] text-danger">Chỉ nhận liên kết youtube.com, youtu.be hoặc vimeo.com.</span>
                                    )}
                                </label>
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
                                onUploaded={(asset, file) => {
                                    const previewUrl = URL.createObjectURL(file);
                                    objectUrls.current.push(previewUrl);
                                    setDraft(current => ({
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
                                                {slide.previewUrl
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    ? <img src={slide.previewUrl} alt="" className="h-full w-full object-cover" />
                                                    : <span className="text-[10px] text-muted-foreground">#{slide.assetId}</span>}
                                            </div>
                                            <input
                                                className={inputClass}
                                                value={slide.caption}
                                                placeholder="Chú thích"
                                                aria-label={`Chú thích slide ${index + 1}`}
                                                onChange={event => set({slides: draft.slides.map(item => item.key === slide.key ? {...item, caption: event.target.value} : item)})}
                                            />
                                            <button type="button" className={ghostButton} disabled={index === 0} onClick={() => moveSlide(index, index - 1)} aria-label="Lên trên">
                                                <ArrowUp className="h-3.5 w-3.5" />
                                            </button>
                                            <button type="button" className={ghostButton} disabled={index === draft.slides.length - 1} onClick={() => moveSlide(index, index + 1)} aria-label="Xuống dưới">
                                                <ArrowDown className="h-3.5 w-3.5" />
                                            </button>
                                            <button type="button" className={ghostButton} onClick={() => set({slides: draft.slides.filter(item => item.key !== slide.key)})} aria-label="Bỏ slide">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    )}

                    {draft.type === 'ARTICLE' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">Nội dung (Markdown: ### tiêu đề, - danh sách, | bảng |) <RequiredMark /></span>
                                <button type="button" onClick={() => setArticlePreview(value => !value)} className="text-[11px] font-medium text-muted hover:text-foreground">
                                    {articlePreview ? 'Sửa' : 'Xem trước'}
                                </button>
                            </div>
                            {articlePreview ? (
                                <div className="max-h-80 overflow-y-auto rounded-panel border border-border p-4">
                                    <MarkdownSopRenderer markdown={draft.bodyMarkdown} />
                                </div>
                            ) : (
                                <textarea
                                    rows={12}
                                    className={`${inputClass} font-mono`}
                                    value={draft.bodyMarkdown}
                                    onChange={event => set({bodyMarkdown: event.target.value})}
                                    aria-label="Nội dung bài đọc"
                                />
                            )}
                        </div>
                    )}

                    {draft.type === 'DOCUMENT' && (
                        <div className="space-y-2 rounded-panel border border-border p-3">
                            <p className="font-semibold text-foreground">Tệp PDF <RequiredMark /></p>
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
                                onUploaded={(asset, file) => set({documentAssetId: asset.assetId, documentFileName: file.name})}
                            />
                            <p className="text-[11px] text-muted-foreground">Học viên đọc PDF ngay trong trình phát, có nút mở tab mới và tải xuống.</p>
                        </div>
                    )}

                    {draft.type !== 'ARTICLE' && (
                        <label className="block">
                            <span className="mb-1 block font-semibold text-foreground">Ghi chú bài học (Markdown) <OptionalMark /></span>
                            <textarea
                                rows={4}
                                className={`${inputClass} font-mono`}
                                value={draft.bodyMarkdown}
                                placeholder="Hiện ở tab Tổng quan dưới trình phát."
                                onChange={event => set({bodyMarkdown: event.target.value})}
                            />
                        </label>
                    )}

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
                            onUploaded={(asset, file) => setDraft(current => ({
                                ...current,
                                resources: [...current.resources, {
                                    key: `new-${asset.assetId}`,
                                    assetId: asset.assetId,
                                    title: defaultResourceTitle(file.name),
                                    contentType: asset.contentType || file.type,
                                    size: asset.size || file.size,
                                }],
                            }))}
                        />
                        {draft.resources.length > 0 && (
                            <ol className="space-y-2">
                                {draft.resources.map((resource, index) => {
                                    const Icon = RESOURCE_ICONS[resourceFileKind(resource.contentType)];
                                    const size = formatFileSize(resource.size);
                                    return (
                                        <li key={resource.key} className="flex items-center gap-2">
                                            <span className="w-5 shrink-0 text-right text-muted-foreground tabular-nums">{index + 1}</span>
                                            <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                                            <input
                                                className={inputClass}
                                                value={resource.title}
                                                placeholder="Tên hiển thị"
                                                aria-label={`Tên tài liệu ${index + 1}`}
                                                aria-invalid={attempted && !resource.title.trim()}
                                                onChange={event => set({resources: draft.resources.map(item => item.key === resource.key ? {...item, title: event.target.value} : item)})}
                                            />
                                            {size && <span className="hidden w-16 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums sm:inline">{size}</span>}
                                            <button type="button" className={ghostButton} disabled={index === 0} onClick={() => moveResource(index, index - 1)} aria-label="Lên trên">
                                                <ArrowUp className="h-3.5 w-3.5" />
                                            </button>
                                            <button type="button" className={ghostButton} disabled={index === draft.resources.length - 1} onClick={() => moveResource(index, index + 1)} aria-label="Xuống dưới">
                                                <ArrowDown className="h-3.5 w-3.5" />
                                            </button>
                                            <button type="button" className={ghostButton} onClick={() => set({resources: draft.resources.filter(item => item.key !== resource.key)})} aria-label="Bỏ tài liệu">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={draft.active} onChange={event => set({active: event.target.checked})} className="h-4 w-4 accent-slate-700" />
                        <span className="font-medium text-foreground">Hiện cho học viên</span>
                    </label>

                    {save.error && <ErrorNotice error={save.error} />}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                    {attempted && problem && <span className="mr-auto text-[11px] text-danger">{problem}</span>}
                    <button type="button" onClick={onClose} className="h-8 rounded-control border border-border bg-card px-3 text-xs font-medium text-muted hover:text-foreground">
                        Huỷ
                    </button>
                    <button
                        type="button"
                        disabled={save.isPending}
                        onClick={() => {
                            setAttempted(true);
                            if (!problem) save.mutate(payloadFrom(draft, courseId));
                        }}
                        className="h-8 rounded-control bg-primary px-4 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                        {save.isPending ? 'Đang lưu…' : lesson ? 'Lưu thay đổi' : 'Thêm bài'}
                    </button>
                </div>
            </div>
        </div>
    );
}
