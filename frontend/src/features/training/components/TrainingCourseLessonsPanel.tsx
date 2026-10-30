'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
    ArrowDown,
    ArrowUp,
    BookOpen,
    Check,
    CircleAlert,
    Eye,
    EyeOff,
    FileText,
    FileUp,
    Files,
    ImagePlus,
    Link2,
    LoaderCircle,
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
import {RESOURCE_ICONS} from '@/features/training/components/TrainingLessonViewers';
import {trainingCoursesQueryKey} from '@/features/training/components/TrainingCourseCatalog';
import {MarkdownSopRenderer} from '@/features/training/components/MarkdownSopRenderer';
import {adminTrainingPreviewHref} from '@/features/training/utils/training-meta';
import {
    defaultResourceTitle,
    formatFileSize,
    isSupportedDocumentLink,
    isSupportedVideoLink,
    LESSON_TYPE_LABELS,
    moveItem,
    planBulkLessons,
    resourceFileKind,
    respacedSortOrders,
    TRAINING_IMAGE_TYPES,
    TRAINING_PDF_TYPE,
    TRAINING_VIDEO_TYPES,
    trainingFileContentType,
} from '@/features/training/utils/course-helpers';
import type {BulkLessonType, BulkRejectReason} from '@/features/training/utils/course-helpers';

const lessonsQueryKey = (courseId: number) => ['uav-training-admin-lessons', courseId] as const;

const TYPE_ICONS: Record<TrainingLessonType, LucideIcon> = {VIDEO: Video, SLIDES: Presentation, ARTICLE: BookOpen, DOCUMENT: FileText};

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
        documentUrl: lesson.documentUrl ?? null,
        // Re-send the attachments as listed; leave the key out if the listing did not carry them so they are not wiped.
        ...(lesson.resources ? {resources: lesson.resources.map(resource => ({assetId: resource.assetId, title: resource.title}))} : {}),
        ...overrides,
    };
}

/**
 * Admin side of a course: its cover image, a link to the learner view, the lesson list with add,
 * edit, reorder (sort order + up/down) and hide/show, and a drop area that turns files into lessons.
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
    // The catalogue lists active courses only, so a hidden course is not in it: prefer the cover the
    // server just returned, then the document's own, then the catalogue's. `undefined` = not known.
    const [savedCover, setSavedCover] = useState<string | null | undefined>(undefined);
    const coverUrl = savedCover !== undefined ? savedCover
        : document.coverUrl !== undefined ? document.coverUrl
            : summary?.coverUrl;
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
    const cover = useMutation({
        mutationFn: (assetId: number | null) => trainingService.adminSetCover(document.id, assetId),
        // The server answers with the course summary: show the new cover at once, then refresh the lists.
        onSuccess: (saved, assetId) => {
            setSavedCover(saved ? saved.coverUrl ?? null : assetId === null ? null : undefined);
            if (saved) {
                queryClient.setQueryData<TrainingCourseSummary[]>(trainingCoursesQueryKey(portal), list =>
                    list?.map(course => (course.id === saved.id ? {...course, ...saved} : course)));
            }
        },
        onSettled: () => queryClient.invalidateQueries({queryKey: ['uav-training-courses']}),
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
                            {coverUrl === undefined && !document.active ? 'Khóa học đang ẩn: ảnh bìa hiện sau khi tải ảnh mới' : 'Chưa có ảnh bìa'}
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
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                        Chưa có bài học. Kéo thả video, PDF hoặc ảnh slide vào ô bên dưới, hoặc bấm “Thêm bài học”.
                    </p>
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
                                        <button type="button" className={ghostButton} disabled={busy} onClick={() => setEditing(lesson)} aria-label="Sửa bài" title="Sửa bài">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        {/* Lessons are never deleted, only hidden from learners (and can be shown again). */}
                                        <button
                                            type="button"
                                            className={ghostButton}
                                            disabled={busy}
                                            onClick={() => {
                                                if (!lesson.active || window.confirm(`Ẩn bài "${lesson.title}"? Học viên sẽ không thấy bài này nữa; bạn có thể hiện lại bất cứ lúc nào.`)) {
                                                    toggleActive.mutate(lesson);
                                                }
                                            }}
                                            aria-label={lesson.active ? 'Ẩn bài' : 'Hiện lại bài'}
                                            title={lesson.active ? 'Ẩn bài' : 'Hiện lại bài'}
                                        >
                                            {lesson.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
            {actionError && <ErrorNotice error={actionError} />}

            <BulkLessonUpload
                courseId={document.id}
                nextSortOrder={nextSortOrder}
                lastSection={lastSection}
                onCreated={() => void refresh()}
            />

            {editing && (
                <LessonDialog
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
    documentSource: 'FILE' | 'LINK';
    documentAssetId: number | null;
    documentFileName: string | null;
    documentUrl: string;
    resources: ResourceDraft[];
}

function draftFrom(lesson: AdminTrainingLesson | null, sortOrder: number, sectionTitle: string): LessonDraft {
    if (!lesson) {
        return {
            sectionTitle, title: '', type: 'VIDEO', sortOrder, durationMinutes: 5, active: true,
            videoSource: 'FILE', videoUrl: '', videoAssetId: null, videoFileName: null, bodyMarkdown: '', slides: [],
            documentSource: 'FILE', documentAssetId: null, documentFileName: null, documentUrl: '', resources: [],
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
        documentSource: lesson.documentUrl ? 'LINK' : 'FILE',
        documentAssetId: lesson.documentAssetId ?? null,
        documentFileName: (lesson.document?.kind !== 'EMBED' ? lesson.document?.fileName : null)
            ?? (lesson.documentAssetId ? `Tệp PDF đã tải lên #${lesson.documentAssetId}` : null),
        documentUrl: lesson.documentUrl ?? '',
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
    if (draft.type === 'DOCUMENT') {
        if (draft.documentSource === 'FILE' && draft.documentAssetId === null) return 'Tải tệp PDF lên trước khi lưu.';
        if (draft.documentSource === 'LINK' && !isSupportedDocumentLink(draft.documentUrl)) return 'Dán liên kết Google Docs, Slides, Sheets hoặc Google Drive.';
    }
    if (draft.resources.some(resource => !resource.title.trim())) return 'Đặt tên cho mọi tài liệu đính kèm.';
    return null;
}

function payloadFrom(draft: LessonDraft, courseId: number): UpsertTrainingLessonPayload {
    const isVideo = draft.type === 'VIDEO';
    const isDocument = draft.type === 'DOCUMENT';
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
        // An article's body is the lesson; other types keep whatever notes they had (no longer shown or edited).
        bodyMarkdown: draft.type === 'ARTICLE' ? draft.bodyMarkdown : draft.bodyMarkdown.trim() || null,
        slides: draft.type === 'SLIDES' ? draft.slides.map(slide => ({assetId: slide.assetId, caption: slide.caption.trim()})) : [],
        documentAssetId: isDocument && draft.documentSource === 'FILE' ? draft.documentAssetId : null,
        documentUrl: isDocument && draft.documentSource === 'LINK' ? draft.documentUrl.trim() : null,
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
    const [uploads, setUploads] = useState(0);
    const objectUrls = useRef<string[]>([]);
    const set = (patch: Partial<LessonDraft>) => setDraft(current => ({...current, ...patch}));
    // While a file is uploading the dialog cannot be closed or saved: the asset would be lost or missing.
    const uploading = uploads > 0;
    const onUploadBusy = useCallback((busy: boolean) => setUploads(count => Math.max(0, count + (busy ? 1 : -1))), []);

    // Local previews of freshly uploaded slides are released with the dialog.
    useEffect(() => {
        const urls = objectUrls.current;
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, []);

    const save = useMutation({
        mutationFn: (payload: UpsertTrainingLessonPayload) =>
            lesson ? trainingService.adminUpdateLesson(lesson.id, payload) : trainingService.adminCreateLesson(payload),
        onSuccess: onSaved,
    });
    const locked = uploading || save.isPending;

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !locked) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, locked]);

    const problem = draftProblem(draft);
    const moveSlide = (from: number, to: number) => set({slides: moveItem(draft.slides, from, to)});
    const moveResource = (from: number, to: number) => set({resources: moveItem(draft.resources, from, to)});

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="lesson-dialog-title">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-overlay border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <h3 id="lesson-dialog-title" className="text-sm font-bold text-foreground">{lesson ? 'Sửa bài học' : 'Thêm bài học'}</h3>
                    <button type="button" onClick={onClose} disabled={locked} aria-label="Đóng" title={uploading ? 'Đang tải tệp lên' : 'Đóng'} className={ghostButton}>
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
                                        disabled={uploading}
                                        onClick={() => set({type})}
                                        className={`flex items-center justify-center gap-1.5 rounded-control border px-3 py-2 font-medium disabled:opacity-50 ${
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
                                        disabled={uploading}
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
                                        onBusyChange={onUploadBusy}
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
                                onBusyChange={onUploadBusy}
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
                        <div className="space-y-3 rounded-panel border border-border p-3">
                            <div className="inline-flex rounded-control border border-border p-0.5" role="group" aria-label="Nguồn tài liệu">
                                {([['FILE', 'Tải PDF lên', FileUp], ['LINK', 'Dán liên kết Google', Link2]] as const).map(([source, label, Icon]) => (
                                    <button
                                        key={source}
                                        type="button"
                                        aria-pressed={draft.documentSource === source}
                                        disabled={uploading}
                                        onClick={() => set({documentSource: source})}
                                        className={`inline-flex items-center gap-1 rounded-control px-2.5 py-1 font-medium ${
                                            draft.documentSource === source ? 'bg-slate-100 text-foreground' : 'text-muted hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {label}
                                    </button>
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
                                        onUploaded={(asset, file) => set({documentAssetId: asset.assetId, documentFileName: file.name})}
                                    />
                                    <p className="text-[11px] text-muted-foreground">Học viên đọc PDF từng trang ngay trong trình phát, có nút mở tab mới và tải xuống.</p>
                                </div>
                            ) : (
                                <label className="block">
                                    <span className="mb-1 block font-semibold text-foreground">Liên kết Google Docs, Slides, Sheets hoặc Drive</span>
                                    <input
                                        type="url"
                                        className={inputClass}
                                        value={draft.documentUrl}
                                        placeholder="https://docs.google.com/document/d/…"
                                        onChange={event => set({documentUrl: event.target.value})}
                                    />
                                    {draft.documentUrl.trim() && !isSupportedDocumentLink(draft.documentUrl) ? (
                                        <span className="mt-1 block text-[11px] text-danger">
                                            Chỉ nhận liên kết https://docs.google.com/… (Docs, Slides, Sheets) hoặc https://drive.google.com/file/d/….
                                        </span>
                                    ) : (
                                        <span className="mt-1 block text-[11px] text-muted-foreground">
                                            Chia sẻ tài liệu ở chế độ “Bất kỳ ai có đường liên kết đều xem được” để học viên mở được.
                                        </span>
                                    )}
                                </label>
                            )}
                        </div>
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
                            onBusyChange={onUploadBusy}
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
                    {uploading ? (
                        <span className="mr-auto text-[11px] text-muted" role="status">Đang tải tệp lên. Chờ xong rồi mới lưu hoặc đóng.</span>
                    ) : attempted && problem && <span className="mr-auto text-[11px] text-danger">{problem}</span>}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={locked}
                        className="h-8 rounded-control border border-border bg-card px-3 text-xs font-medium text-muted hover:text-foreground disabled:opacity-50"
                    >
                        Huỷ
                    </button>
                    <button
                        type="button"
                        disabled={locked}
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

// --- "Thêm nhiều bài từ tệp" ----------------------------------------------------------------------

type BulkStatus = 'waiting' | 'uploading' | 'saving' | 'done' | 'error';
type BulkFile = {key: string; file: File; fraction: number; assetId: number | null; error: string | null};
type BulkLesson = {key: string; type: BulkLessonType; title: string; files: BulkFile[]; status: BulkStatus; error: string | null};

const BULK_ACCEPT = [...TRAINING_VIDEO_TYPES, TRAINING_PDF_TYPE, ...TRAINING_IMAGE_TYPES].join(',');
const BULK_TYPE_ICONS: Record<BulkLessonType, LucideIcon> = {VIDEO: Video, DOCUMENT: FileText, SLIDES: Presentation};

const BULK_REJECT_MESSAGES: Record<BulkRejectReason, string> = {
    type: 'định dạng không dùng được (chỉ video MP4/WebM, PDF hoặc ảnh PNG/JPEG/WebP).',
    size: 'tệp rỗng hoặc quá lớn (video tối đa 500 MB, PDF 50 MB, ảnh 10 MB).',
    office: 'tệp Word/PowerPoint/Excel chỉ dùng làm tài liệu đính kèm: mở một bài và thêm ở mục “Tài liệu đính kèm”, hoặc dán liên kết Google vào bài Tài liệu.',
};

const errorText = (cause: unknown) => (cause instanceof Error && cause.message ? cause.message : 'Không thành công. Thử lại.');

/** A dropped video's length in whole minutes (at least 1), read from its metadata; 5 if it cannot be read in time. */
function readVideoMinutes(file: File): Promise<number> {
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
        video.onloadedmetadata = () => finish(Number.isFinite(video.duration) && video.duration > 0 ? Math.max(1, Math.round(video.duration / 60)) : 5);
        video.onerror = () => finish(5);
        video.src = url;
    });
}

let bulkKeySeed = 0;
const bulkKey = () => `bulk-${(bulkKeySeed += 1)}`;

/**
 * Drop (or pick) many files at once: each video becomes a VIDEO lesson and each PDF a DOCUMENT
 * lesson titled from its file name, and the images dropped together one SLIDES lesson. The admin
 * can rename them and pick the section first; then every file uploads in turn with its own progress
 * and error, and each lesson is created as soon as its files are in.
 */
function BulkLessonUpload({courseId, nextSortOrder, lastSection, onCreated}: {
    courseId: number;
    nextSortOrder: number;
    lastSection: string;
    onCreated: () => void;
}) {
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
        setItems(current => current.map(item => (item.key !== itemKey ? item : {
            ...item,
            files: item.files.map(entry => (entry.key === fileKey ? {...entry, ...patch} : entry)),
        })));

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
                    const asset = await trainingService.uploadAsset(
                        entry.file,
                        fraction => patchFile(item.key, entry.key, {fraction}),
                        undefined,
                        trainingFileContentType(entry.file),
                    );
                    patchFile(item.key, entry.key, {assetId: asset.assetId, fraction: 1});
                    assetIds.push(asset.assetId);
                } catch (cause) {
                    patchFile(item.key, entry.key, {error: errorText(cause)});
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
                const durationMinutes = item.type === 'VIDEO' ? await readVideoMinutes(item.files[0].file)
                    : item.type === 'SLIDES' ? Math.max(1, Math.ceil(assetIds.length / 2))
                        : 5;
                await trainingService.adminCreateLesson({
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
                patchItem(item.key, {status: 'error', error: errorText(cause)});
            }
        }
        setRunning(false);
        if (created > 0) onCreated();
    };

    return (
        <div className="space-y-3 rounded-panel border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Files className="h-4 w-4 text-muted" aria-hidden />
                    Thêm nhiều bài từ tệp
                </h3>
                <span className="text-[11px] text-muted-foreground">Mỗi video, mỗi PDF thành một bài; các ảnh thả cùng lúc thành một bài slide.</span>
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
                <button
                    type="button"
                    disabled={running}
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border bg-card px-3 font-medium text-foreground hover:bg-surface-variant disabled:opacity-50"
                >
                    Chọn tệp
                </button>
                <span className="text-[11px] text-muted-foreground">Video MP4/WebM tối đa 500 MB · PDF tối đa 50 MB · ảnh PNG/JPEG/WebP tối đa 10 MB</span>
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
                    <label className="block max-w-sm">
                        <span className="mb-1 block font-semibold text-foreground">Chương cho các bài mới <OptionalMark /></span>
                        <input
                            className={inputClass}
                            value={sectionTitle}
                            placeholder="Nội dung"
                            disabled={running}
                            onChange={event => setSection(event.target.value)}
                        />
                    </label>

                    <ol className="divide-y divide-border rounded-panel border border-border">
                        {items.map(item => {
                            const Icon = BULK_TYPE_ICONS[item.type];
                            const editable = !running && item.status !== 'done';
                            return (
                                <li key={item.key} className="space-y-1.5 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 shrink-0 text-muted" aria-label={LESSON_TYPE_LABELS[item.type]} />
                                        <input
                                            className={inputClass}
                                            value={item.title}
                                            disabled={!editable}
                                            aria-label="Tên bài"
                                            aria-invalid={!item.title.trim()}
                                            onChange={event => patchItem(item.key, {title: event.target.value})}
                                        />
                                        <span className="w-20 shrink-0 text-right text-[11px] text-muted-foreground">
                                            {LESSON_TYPE_LABELS[item.type]}{item.type === 'SLIDES' && ` · ${item.files.length}`}
                                        </span>
                                        <BulkStatusMark status={item.status} />
                                        <button
                                            type="button"
                                            className={ghostButton}
                                            disabled={!editable}
                                            onClick={() => setItems(current => current.filter(entry => entry.key !== item.key))}
                                            aria-label="Bỏ khỏi danh sách"
                                            title="Bỏ khỏi danh sách"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {item.status !== 'done' && (
                                        <ul className="space-y-1 pl-6">
                                            {item.files.map(entry => {
                                                const percent = Math.round(entry.fraction * 100);
                                                return (
                                                    <li key={entry.key} className="space-y-0.5">
                                                        <div className="flex justify-between gap-2 text-[11px] text-muted">
                                                            <span className="truncate">{entry.file.name} · {formatFileSize(entry.file.size)}</span>
                                                            <span className="shrink-0 tabular-nums">{entry.assetId !== null ? 'Đã tải lên' : `${percent}%`}</span>
                                                        </div>
                                                        <div className="h-1 overflow-hidden rounded-full bg-surface-variant" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Tải lên ${entry.file.name}`}>
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

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            disabled={running}
                            onClick={() => {
                                setItems([]);
                                setRejected([]);
                            }}
                            className="h-8 rounded-control border border-border bg-card px-3 font-medium text-muted hover:text-foreground disabled:opacity-50"
                        >
                            {pending.length === 0 ? 'Xong' : 'Bỏ danh sách'}
                        </button>
                        {pending.length > 0 && (
                            <button
                                type="button"
                                disabled={running}
                                onClick={() => void run()}
                                className="inline-flex h-8 items-center gap-1.5 rounded-control bg-slate-800 px-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                            >
                                {running && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                                {running ? 'Đang tải lên…' : `Tải lên và tạo ${pending.length} bài`}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function BulkStatusMark({status}: {status: BulkStatus}) {
    if (status === 'done') return <Check className="h-4 w-4 shrink-0 text-slate-700" aria-label="Đã tạo bài" />;
    if (status === 'error') return <CircleAlert className="h-4 w-4 shrink-0 text-danger" aria-label="Lỗi" />;
    if (status === 'uploading' || status === 'saving') {
        return <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-muted" aria-label={status === 'saving' ? 'Đang tạo bài' : 'Đang tải lên'} />;
    }
    return <span className="h-4 w-4 shrink-0" aria-hidden />;
}
