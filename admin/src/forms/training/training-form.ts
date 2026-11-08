import type {
    AdminTrainingLesson,
    TrainingDocument,
    TrainingLessonType,
    TrainingPortalTier,
    UpsertTrainingDocumentPayload,
    UpsertTrainingLessonPayload,
} from '@/types/training/training.types';

export type {
    AdminTrainingLesson,
    TrainingDocument,
    TrainingLessonType,
    TrainingPortalTier,
    UpsertTrainingDocumentPayload,
    UpsertTrainingLessonPayload,
};

export interface TrainingSlideDraft {
    key: string;
    assetId: number;
    caption: string;
    previewUrl: string | null;
}

export interface TrainingResourceDraft {
    key: string;
    assetId: number;
    title: string;
    contentType: string | null;
    size: number | null;
}

export interface TrainingLessonDraft {
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
    slides: TrainingSlideDraft[];
    documentSource: 'FILE' | 'LINK';
    documentAssetId: number | null;
    documentFileName: string | null;
    documentUrl: string;
    resources: TrainingResourceDraft[];
}

export type TrainingLessonFieldErrors = Partial<
    Record<'title' | 'sectionTitle' | 'durationMinutes' | 'videoUrl' | 'documentUrl' | 'bodyMarkdown', string>
>;

export type TrainingDocumentFieldErrors = Partial<Record<keyof UpsertTrainingDocumentPayload, string>>;

export function lessonPayloadFromDetail(
    lesson: AdminTrainingLesson,
    overrides: Partial<UpsertTrainingLessonPayload> = {},
): UpsertTrainingLessonPayload {
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
        ...(lesson.resources ? {resources: lesson.resources.map(resource => ({assetId: resource.assetId, title: resource.title}))} : {}),
        ...overrides,
    };
}

export function lessonDraftFromDetail(
    lesson: AdminTrainingLesson | null,
    sortOrder: number,
    sectionTitle: string,
): TrainingLessonDraft {
    if (!lesson) {
        return {
            sectionTitle,
            title: '',
            type: 'VIDEO',
            sortOrder,
            durationMinutes: 5,
            active: true,
            videoSource: 'FILE',
            videoUrl: '',
            videoAssetId: null,
            videoFileName: null,
            bodyMarkdown: '',
            slides: [],
            documentSource: 'FILE',
            documentAssetId: null,
            documentFileName: null,
            documentUrl: '',
            resources: [],
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
        documentFileName:
            (lesson.document?.kind !== 'EMBED' ? lesson.document?.fileName : null) ??
            (lesson.documentAssetId ? `Tệp PDF đã tải lên #${lesson.documentAssetId}` : null),
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

/**
 * Minimal required-presence check only.
 * Host/path validation for YouTube, Vimeo, Google Docs and Google Drive links runs on the backend.
 */
export function lessonDraftProblem(draft: TrainingLessonDraft): string | null {
    if (!draft.title.trim()) return 'Nhập tên bài học.';
    if (draft.type === 'VIDEO') {
        if (draft.videoSource === 'LINK' && !draft.videoUrl.trim()) return 'Nhập liên kết video.';
        if (draft.videoSource === 'FILE' && draft.videoAssetId === null) return 'Tải tệp video lên trước khi lưu.';
    }
    if (draft.type === 'SLIDES' && draft.slides.length === 0) return 'Thêm ít nhất một ảnh slide.';
    if (draft.type === 'ARTICLE' && !draft.bodyMarkdown.trim()) return 'Nhập nội dung bài đọc.';
    if (draft.type === 'DOCUMENT') {
        if (draft.documentSource === 'FILE' && draft.documentAssetId === null) return 'Tải tệp PDF lên trước khi lưu.';
        if (draft.documentSource === 'LINK' && !draft.documentUrl.trim()) return 'Nhập liên kết tài liệu.';
    }
    if (draft.resources.some(resource => !resource.title.trim())) return 'Đặt tên cho mọi tài liệu đính kèm.';
    return null;
}

export function toUpsertTrainingLessonPayload(draft: TrainingLessonDraft, courseId: number): UpsertTrainingLessonPayload {
    const isVideo = draft.type === 'VIDEO';
    const isDocument = draft.type === 'DOCUMENT';
    const duration = Number.isFinite(draft.durationMinutes) ? Math.round(draft.durationMinutes) : 0;
    return {
        courseId,
        sectionTitle: draft.sectionTitle.trim(),
        title: draft.title.trim(),
        type: draft.type,
        sortOrder: draft.sortOrder,
        durationMinutes: duration,
        active: draft.active,
        videoUrl: isVideo && draft.videoSource === 'LINK' ? draft.videoUrl.trim() : null,
        videoAssetId: isVideo && draft.videoSource === 'FILE' ? draft.videoAssetId : null,
        bodyMarkdown: draft.type === 'ARTICLE' ? draft.bodyMarkdown : draft.bodyMarkdown.trim() || null,
        slides: draft.type === 'SLIDES' ? draft.slides.map(slide => ({assetId: slide.assetId, caption: slide.caption.trim()})) : [],
        documentAssetId: isDocument && draft.documentSource === 'FILE' ? draft.documentAssetId : null,
        documentUrl: isDocument && draft.documentSource === 'LINK' ? draft.documentUrl.trim() : null,
        resources: draft.resources.map(resource => ({assetId: resource.assetId, title: resource.title.trim()})),
    };
}

export function trainingLessonFieldErrors(error: unknown): TrainingLessonFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as TrainingLessonFieldErrors) : null;
}

export function emptyTrainingDocumentDraft(
    portal: TrainingPortalTier,
    defaultCategory = 'PREFLIGHT_SOP',
    nextIndex = 1,
): UpsertTrainingDocumentPayload {
    const prefix = portal === 'CUSTOMER' ? 'CUST' : portal === 'OPERATIONS' ? 'OPS' : 'ADM';
    return {
        code: `TRN-${prefix}-0${nextIndex}`,
        targetPortal: portal,
        category: defaultCategory,
        level: 'STANDARD',
        versionTag: 'SOP-2026.2',
        estimatedMinutes: 15,
        isMandatory: true,
        sortOrder: nextIndex * 10,
        active: true,
        title: '',
        summary: '',
        contentMarkdown:
            '### 1. Mục tiêu quy trình\n- Mô tả chi tiết các bước thực hiện.\n\n### 2. Tiêu chuẩn kỹ thuật\n- Các thông số an toàn bắt buộc.',
        checklistSteps: [
            'Xác nhận đã đọc và nắm vững quy trình kỹ thuật',
            'Kiểm tra danh mục an toàn trước khi áp dụng trên hệ thống',
        ],
    };
}

export function trainingDocumentDraftFromDetail(doc: TrainingDocument): UpsertTrainingDocumentPayload {
    return {
        code: doc.code,
        targetPortal: doc.targetPortal,
        category: doc.category,
        level: doc.level,
        versionTag: doc.versionTag || 'SOP-2026.1',
        estimatedMinutes: doc.estimatedMinutes || 15,
        isMandatory: doc.isMandatory,
        sortOrder: doc.sortOrder || 10,
        active: doc.active,
        title: doc.title,
        summary: doc.summary,
        contentMarkdown: doc.contentMarkdown,
        checklistSteps: doc.checklistSteps.length > 0 ? [...doc.checklistSteps] : [],
    };
}

export function canSubmitTrainingDocument(draft: UpsertTrainingDocumentPayload): boolean {
    return Boolean(
        draft.code.trim() &&
            draft.category.trim() &&
            draft.title.trim() &&
            draft.summary.trim() &&
            draft.contentMarkdown.trim(),
    );
}

export function toUpsertTrainingDocumentPayload(draft: UpsertTrainingDocumentPayload): UpsertTrainingDocumentPayload {
    return {
        code: draft.code.trim(),
        targetPortal: draft.targetPortal,
        category: draft.category.trim(),
        level: draft.level.trim(),
        versionTag: draft.versionTag?.trim() || undefined,
        estimatedMinutes: Number.isFinite(draft.estimatedMinutes) ? Math.trunc(draft.estimatedMinutes) : 0,
        isMandatory: draft.isMandatory,
        sortOrder: Number.isFinite(draft.sortOrder) ? Math.trunc(draft.sortOrder) : 10,
        active: draft.active,
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        contentMarkdown: draft.contentMarkdown.trim(),
        checklistSteps: (draft.checklistSteps ?? []).map(step => step.trim()).filter(Boolean),
    };
}

export function trainingDocumentFieldErrors(error: unknown): TrainingDocumentFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as TrainingDocumentFieldErrors) : null;
}

