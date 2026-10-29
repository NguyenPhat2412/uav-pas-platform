export type TrainingPortalTier = 'CUSTOMER' | 'OPERATIONS' | 'ADMIN';

export type TrainingProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type TrainingLevel = 'FOUNDATION' | 'STANDARD' | 'ADVANCED' | 'SOP_CRITICAL';

export interface TrainingDocument {
    id: number;
    code: string;
    slug: string;
    targetPortal: TrainingPortalTier;
    category: string;
    level: TrainingLevel | string;
    versionTag: string;
    estimatedMinutes: number;
    isMandatory: boolean;
    sortOrder: number;
    active: boolean;
    title: string;
    summary: string;
    contentMarkdown: string;
    checklistSteps: string[];
    progressStatus: TrainingProgressStatus;
    checkedSteps: number[];
    completedAt: string | null;
    updatedAt: string | null;
}

export interface TrainingOverview {
    portal: TrainingPortalTier;
    totalDocuments: number;
    completedDocuments: number;
    mandatoryDocuments: number;
    mandatoryCompleted: number;
    totalEstimatedMinutes: number;
    completedMinutes: number;
    documents: TrainingDocument[];
}

export interface UpdateTrainingProgressPayload {
    checkedSteps: number[];
    markCompleted?: boolean;
}

export interface UpsertTrainingDocumentPayload {
    code: string;
    targetPortal: TrainingPortalTier;
    category: string;
    level: string;
    versionTag?: string;
    estimatedMinutes: number;
    isMandatory: boolean;
    sortOrder: number;
    active: boolean;
    title: string;
    summary: string;
    contentMarkdown: string;
    checklistSteps: string[];
}

export interface TrainingAcademyWorkspaceProps {
    defaultPortal: TrainingPortalTier;
    /** Admin view: add and edit documents instead of tracking the reader's own progress. */
    manage?: boolean;
}

/** Where /admin/training lands: the sidebar lists the customer, operations and admin catalogues separately. */
export const TRAINING_ADMIN_HOME = '/admin/training/customer';

// ---------------------------------------------------------------------------------------------
// Courses (docs/training-courses-api.md): a training document seen as a course of lessons.
// ---------------------------------------------------------------------------------------------

export type TrainingLessonType = 'VIDEO' | 'SLIDES' | 'ARTICLE' | 'DOCUMENT';

/** One card in the learner catalogue: `GET /api/v1/training/courses?portal=`. */
export interface TrainingCourseSummary {
    id: number;
    code: string;
    slug: string;
    title: string;
    summary: string;
    category: string;
    level: TrainingLevel | string;
    targetPortal: TrainingPortalTier;
    isMandatory: boolean;
    estimatedMinutes: number;
    /** Signed GET URL, or null when there is no cover or storage is not configured. */
    coverUrl: string | null;
    lessonCount: number;
    videoCount: number;
    /** DOCUMENT (PDF guide) lessons; older servers omit it. */
    documentCount?: number;
    completedLessons: number;
    progressPercent: number;
    status: TrainingProgressStatus;
}

export interface TrainingCourseLessonItem {
    id: number;
    title: string;
    type: TrainingLessonType;
    durationMinutes: number;
    completed: boolean;
    /** Downloadable files attached to the lesson; older servers omit it. */
    resourceCount?: number;
}

export interface TrainingCourseSection {
    title: string;
    lessons: TrainingCourseLessonItem[];
}

/** `GET /api/v1/training/courses/{codeOrSlug}`. */
export interface TrainingCourseDetail extends TrainingCourseSummary {
    overviewMarkdown: string;
    checklistSteps: string[];
    checkedSteps: number[];
    sections: TrainingCourseSection[];
}

export type TrainingLessonVideo =
    | {kind: 'FILE'; url: string | null; contentType: string}
    | {kind: 'EXTERNAL'; url: string};

export interface TrainingLessonSlide {
    /** Signed GET URL; null when storage is not configured. */
    url: string | null;
    caption: string | null;
}

/** The PDF of a DOCUMENT lesson. */
export interface TrainingLessonDocument {
    /** Signed GET URL; null when storage is not configured. */
    url: string | null;
    fileName: string;
    size: number;
}

/** A downloadable file attached to a lesson (Udemy "Resources"). */
export interface TrainingLessonResource {
    title: string;
    /** Signed GET URL; null when storage is not configured. */
    url: string | null;
    contentType: string;
    size: number;
}

/** `GET /api/v1/training/lessons/{id}`. */
export interface TrainingLessonDetail {
    id: number;
    courseCode: string;
    courseSlug: string;
    title: string;
    type: TrainingLessonType;
    durationMinutes: number;
    video: TrainingLessonVideo | null;
    slides: TrainingLessonSlide[];
    bodyMarkdown: string | null;
    document?: TrainingLessonDocument | null;
    resources?: TrainingLessonResource[];
    completed: boolean;
    positionSeconds: number;
    prevLessonId: number | null;
    nextLessonId: number | null;
}

/** `PUT /api/v1/training/lessons/{id}/progress`. */
export interface UpdateTrainingLessonProgressPayload {
    completed: boolean;
    positionSeconds: number;
}

export interface TrainingLessonSlideInput {
    assetId: number;
    caption: string;
}

export interface TrainingLessonResourceInput {
    assetId: number;
    title: string;
}

/** Body of `POST /admin/lessons` and `PUT /admin/lessons/{id}`. */
export interface UpsertTrainingLessonPayload {
    courseId: number;
    sectionTitle: string;
    title: string;
    type: TrainingLessonType;
    sortOrder: number;
    durationMinutes: number;
    active: boolean;
    videoUrl: string | null;
    videoAssetId: number | null;
    bodyMarkdown: string | null;
    slides: TrainingLessonSlideInput[];
    /** READY application/pdf asset; DOCUMENT lessons only. */
    documentAssetId: number | null;
    /**
     * Files attached to the lesson, in order. Left out only when re-saving a lesson whose admin
     * listing did not carry its resources, so they are not wiped.
     */
    resources?: TrainingLessonResourceInput[];
}

/** `GET /admin/courses/{id}/lessons`: every editable field, plus the lesson id. */
export interface AdminTrainingLesson extends Omit<UpsertTrainingLessonPayload, 'sectionTitle' | 'slides' | 'documentAssetId' | 'resources'> {
    id: number;
    sectionTitle: string | null;
    /** The server may also send a signed `url` for each slide, used for thumbnails when present. */
    slides: Array<TrainingLessonSlideInput & {url?: string | null}>;
    documentAssetId?: number | null;
    /** Present when the server sends it; used to show the PDF's name in the editor. */
    document?: TrainingLessonDocument | null;
    resources?: Array<TrainingLessonResourceInput & {url?: string | null; contentType?: string; size?: number}>;
}

export interface TrainingAssetUploadRequest {
    fileName: string;
    contentType: string;
    size: number;
}

/** `POST /admin/assets`: where the browser PUTs the file. */
export interface TrainingAssetUploadTicket {
    assetId: number;
    uploadUrl: string;
    method: string;
    headers: Record<string, string>;
}

/** `POST /admin/assets/{id}/confirm`. */
export interface TrainingAssetConfirmation {
    assetId: number;
    status: string;
    contentType: string;
    size: number;
}
