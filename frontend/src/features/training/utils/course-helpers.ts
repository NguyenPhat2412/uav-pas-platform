/**
 * Pure helpers for the course catalogue, player and editor. No React and no runtime imports, so
 * tests/training-courses.test.mjs can load this file on its own.
 */
import type {
    TrainingCourseLessonItem,
    TrainingCourseSection,
    TrainingLessonType,
    TrainingProgressStatus,
} from '@/features/training/types/training.types';

// --- Slides ---------------------------------------------------------------------------------------

export type SlideMove = 'next' | 'prev' | 'first' | 'last' | number;

/** The slide shown after a move, clamped to the deck (no wrap-around). An empty deck stays at 0. */
export function slideIndexAfter(current: number, count: number, move: SlideMove): number {
    if (count <= 0) return 0;
    const target =
        move === 'next' ? current + 1
            : move === 'prev' ? current - 1
                : move === 'first' ? 0
                    : move === 'last' ? count - 1
                        : Math.trunc(move);
    return Math.min(Math.max(target, 0), count - 1);
}

/** "3/12" for the third of twelve slides. */
export function slideCounter(index: number, count: number): string {
    return count > 0 ? `${slideIndexAfter(index, count, index) + 1}/${count}` : '0/0';
}

export function isLastSlide(index: number, count: number): boolean {
    return count > 0 && index >= count - 1;
}

// --- Video progress -------------------------------------------------------------------------------

export const VIDEO_COMPLETE_RATIO = 0.9;
export const VIDEO_SAVE_INTERVAL_MS = 15_000;

/** Watched far enough (≥ 90 %) to count the lesson as done. */
export function isVideoWatched(currentTime: number, duration: number, ratio = VIDEO_COMPLETE_RATIO): boolean {
    return Number.isFinite(duration) && duration > 0 && currentTime / duration >= ratio;
}

/** Where to resume: the saved position, or the start when it is missing or within 5 s of the end. */
export function resumePosition(savedSeconds: number, duration: number): number {
    if (!Number.isFinite(savedSeconds) || savedSeconds <= 0) return 0;
    if (Number.isFinite(duration) && duration > 0 && savedSeconds >= duration - 5) return 0;
    return savedSeconds;
}

export function isPositionSaveDue(lastSavedAt: number, now: number, intervalMs = VIDEO_SAVE_INTERVAL_MS): boolean {
    return now - lastSavedAt >= intervalMs;
}

// --- Course navigation ------------------------------------------------------------------------------

export function flattenLessons(sections: readonly TrainingCourseSection[]): TrainingCourseLessonItem[] {
    return sections.flatMap(section => section.lessons);
}

/** `?lesson=12` → 12; anything that is not a positive integer → null. */
export function parseLessonParam(value: string | null | undefined): number | null {
    if (!value || !/^\d+$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** The lesson to open: the one in the URL if it belongs to the course, else the first unfinished one, else the first. */
export function pickStartLesson(sections: readonly TrainingCourseSection[], requestedId: number | null): number | null {
    const lessons = flattenLessons(sections);
    if (lessons.length === 0) return null;
    if (requestedId !== null && lessons.some(lesson => lesson.id === requestedId)) return requestedId;
    return (lessons.find(lesson => !lesson.completed) ?? lessons[0]).id;
}

/** Previous and next lesson ids across sections, from the curriculum. */
export function neighbourLessons(sections: readonly TrainingCourseSection[], lessonId: number): {prev: number | null; next: number | null} {
    const lessons = flattenLessons(sections);
    const index = lessons.findIndex(lesson => lesson.id === lessonId);
    if (index < 0) return {prev: null, next: null};
    return {prev: lessons[index - 1]?.id ?? null, next: lessons[index + 1]?.id ?? null};
}

export function lessonHref(basePath: string, slug: string, lessonId: number | null): string {
    const path = `${basePath}/${encodeURIComponent(slug)}`;
    return lessonId === null ? path : `${path}?lesson=${lessonId}`;
}

// --- Catalogue ---------------------------------------------------------------------------------------

export type CourseCallToAction = 'start' | 'continue' | 'done';

export function courseCallToAction(status: TrainingProgressStatus, completedLessons: number): CourseCallToAction {
    if (status === 'COMPLETED') return 'done';
    return status === 'IN_PROGRESS' || completedLessons > 0 ? 'continue' : 'start';
}

/** Case- and accent-insensitive match on title, summary and code. */
export function matchesCourseSearch(course: {title: string; summary: string; code: string}, query: string): boolean {
    const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    const q = fold(query.trim());
    if (!q) return true;
    return [course.title, course.summary, course.code].some(text => fold(text ?? '').includes(q));
}

export function sumLessonMinutes(lessons: readonly {durationMinutes: number}[]): number {
    return lessons.reduce((total, lesson) => total + (Number.isFinite(lesson.durationMinutes) ? lesson.durationMinutes : 0), 0);
}

// --- Editor ----------------------------------------------------------------------------------------

export const TRAINING_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;
export const TRAINING_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const TRAINING_PDF_TYPE = 'application/pdf';
/** Word, PowerPoint and Excel files: lesson attachments only, never a lesson's own content. */
export const TRAINING_OFFICE_TYPES = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;
export const TRAINING_VIDEO_MAX_BYTES = 500 * 1000 * 1000;
export const TRAINING_IMAGE_MAX_BYTES = 10 * 1000 * 1000;
export const TRAINING_PDF_MAX_BYTES = 50 * 1000 * 1000;
export const TRAINING_OFFICE_MAX_BYTES = 50 * 1000 * 1000;

/** `pdf`: a DOCUMENT lesson's guide. `resource`: a lesson attachment (PDF, image, .docx, .pptx or .xlsx). */
export type TrainingAssetKind = 'video' | 'image' | 'pdf' | 'resource';

const TYPES_BY_EXTENSION: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    pdf: TRAINING_PDF_TYPE,
    docx: TRAINING_OFFICE_TYPES[0],
    pptx: TRAINING_OFFICE_TYPES[1],
    xlsx: TRAINING_OFFICE_TYPES[2],
};

/** The file's MIME type, or the one its extension implies when the browser left it empty (common for Office files). */
export function trainingFileContentType(file: {type: string; name?: string}): string {
    if (file.type) return file.type;
    const extension = file.name?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
    return (extension && TYPES_BY_EXTENSION[extension]) || '';
}

/** The size limit for one file of this kind, by its MIME type; null when the type is not accepted. */
export function trainingAssetMaxBytes(contentType: string, kind: TrainingAssetKind): number | null {
    const isImage = (TRAINING_IMAGE_TYPES as readonly string[]).includes(contentType);
    const isPdf = contentType === TRAINING_PDF_TYPE;
    const isOffice = (TRAINING_OFFICE_TYPES as readonly string[]).includes(contentType);
    switch (kind) {
        case 'video': return (TRAINING_VIDEO_TYPES as readonly string[]).includes(contentType) ? TRAINING_VIDEO_MAX_BYTES : null;
        case 'image': return isImage ? TRAINING_IMAGE_MAX_BYTES : null;
        case 'pdf': return isPdf ? TRAINING_PDF_MAX_BYTES : null;
        case 'resource': return isPdf ? TRAINING_PDF_MAX_BYTES : isImage ? TRAINING_IMAGE_MAX_BYTES : isOffice ? TRAINING_OFFICE_MAX_BYTES : null;
    }
}

/** Client-side check before asking for an upload URL; the server enforces the same limits. */
export function trainingAssetError(file: {type: string; size: number; name?: string}, kind: TrainingAssetKind): 'type' | 'size' | null {
    const max = trainingAssetMaxBytes(trainingFileContentType(file), kind);
    if (max === null) return 'type';
    if (file.size <= 0 || file.size > max) return 'size';
    return null;
}

export type ResourceFileKind = 'pdf' | 'image' | 'word' | 'slides' | 'sheet' | 'file';

/** What a downloadable file looks like in the resource lists: picks the icon and the label. */
export function resourceFileKind(contentType: string | null | undefined): ResourceFileKind {
    if (contentType === TRAINING_PDF_TYPE) return 'pdf';
    if (contentType === TRAINING_OFFICE_TYPES[0]) return 'word';
    if (contentType === TRAINING_OFFICE_TYPES[1]) return 'slides';
    if (contentType === TRAINING_OFFICE_TYPES[2]) return 'sheet';
    return contentType?.startsWith('image/') ? 'image' : 'file';
}

/** The title an attachment or a lesson made from a file gets by default: the file name without its extension. */
export function defaultResourceTitle(fileName: string): string {
    const trimmed = fileName.trim();
    const dot = trimmed.lastIndexOf('.');
    return dot > 0 ? trimmed.slice(0, dot) : trimmed;
}

export const defaultLessonTitle = defaultResourceTitle;

// --- Bulk "add lessons from files" -------------------------------------------------------------------

export type BulkLessonType = 'VIDEO' | 'DOCUMENT' | 'SLIDES';

/** Why a dropped file does not become a lesson: wrong type, too big or empty, or an Office file (attachment only). */
export type BulkRejectReason = 'type' | 'size' | 'office';

export interface BulkLessonPlan<F> {
    lessons: Array<{type: BulkLessonType; title: string; files: F[]}>;
    rejected: Array<{file: F; reason: BulkRejectReason}>;
}

const naturalOrder = (a: string, b: string) => a.localeCompare(b, 'vi', {numeric: true, sensitivity: 'base'});

/**
 * One slide deck's title from its image names: their common start without trailing numbering
 * ("Quy trình 01.png", "Quy trình 02.png" → "Quy trình"), else the first image's name.
 */
export function slidesLessonTitle(fileNames: readonly string[]): string {
    const names = fileNames.map(defaultResourceTitle).filter(Boolean);
    if (names.length === 0) return 'Slide';
    let prefix = names[0];
    for (const name of names.slice(1)) {
        let length = 0;
        while (length < prefix.length && length < name.length && prefix[length] === name[length]) length += 1;
        prefix = prefix.slice(0, length);
    }
    const cleaned = prefix.replace(/[\s._-]*\d*$/, '').replace(/[\s._(-]+$/, '').trim();
    return names.length > 1 && cleaned ? cleaned : names[0];
}

/**
 * Turns dropped files into lessons, in drop order: each video a VIDEO lesson and each PDF a DOCUMENT
 * lesson, titled from the file name; all the images together one SLIDES lesson (in file-name order),
 * placed where the first image was. Anything else is rejected with the reason.
 */
export function planBulkLessons<F extends {name: string; type: string; size: number}>(files: readonly F[]): BulkLessonPlan<F> {
    const plan: BulkLessonPlan<F> = {lessons: [], rejected: []};
    let slides: {type: BulkLessonType; title: string; files: F[]} | null = null;
    for (const file of files) {
        const type = trainingFileContentType(file);
        const kind: TrainingAssetKind | null = (TRAINING_VIDEO_TYPES as readonly string[]).includes(type) ? 'video'
            : type === TRAINING_PDF_TYPE ? 'pdf'
                : (TRAINING_IMAGE_TYPES as readonly string[]).includes(type) ? 'image'
                    : null;
        if (kind === null) {
            plan.rejected.push({file, reason: (TRAINING_OFFICE_TYPES as readonly string[]).includes(type) ? 'office' : 'type'});
            continue;
        }
        if (trainingAssetError(file, kind) !== null) {
            plan.rejected.push({file, reason: 'size'});
            continue;
        }
        if (kind === 'image') {
            if (!slides) {
                slides = {type: 'SLIDES', title: '', files: []};
                plan.lessons.push(slides);
            }
            slides.files.push(file);
        } else {
            plan.lessons.push({type: kind === 'video' ? 'VIDEO' : 'DOCUMENT', title: defaultLessonTitle(file.name), files: [file]});
        }
    }
    if (slides) {
        slides.files.sort((a, b) => naturalOrder(a.name, b.name));
        slides.title = slidesLessonTitle(slides.files.map(file => file.name));
    }
    return plan;
}

/** Lessons done and total, and the 0–100 share, for the player's progress ring. */
export function courseLessonProgress(sections: readonly TrainingCourseSection[]): {done: number; total: number; percent: number} {
    const lessons = flattenLessons(sections);
    const done = lessons.filter(lesson => lesson.completed).length;
    return {done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0};
}

function parseHttpsLike(value: string, allowHttp: boolean): URL | null {
    let url: URL;
    try {
        url = new URL(value.trim());
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) return null;
    if (url.username || url.password || (url.port && url.port !== '443' && url.port !== '80')) return null;
    return url;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,15}$/;
const VIMEO_HASH = /^[0-9a-f]{6,32}$/;

/**
 * The links an admin may paste for an external video, as the server accepts them
 * (TrainingVideoUrls): youtube.com/watch?v=ID (www. and m. too), youtube.com/embed|shorts|live|v/ID,
 * youtu.be/ID, and vimeo.com/ID (also /ID/hash, /channels/x/ID, /groups/x/videos/ID). Not playlists,
 * channels, youtube-nocookie.com or player.vimeo.com.
 */
export function isSupportedVideoLink(value: string): boolean {
    const url = parseHttpsLike(value, true);
    if (!url) return false;
    const segments = url.pathname.split('/').filter(Boolean);
    switch (url.hostname.toLowerCase()) {
        case 'youtube.com':
        case 'www.youtube.com':
        case 'm.youtube.com': {
            if (segments.length === 1 && segments[0] === 'watch') return YOUTUBE_ID.test(url.searchParams.get('v') ?? '');
            return segments.length === 2 && ['embed', 'shorts', 'live', 'v'].includes(segments[0]) && YOUTUBE_ID.test(segments[1]);
        }
        case 'youtu.be':
            return segments.length === 1 && YOUTUBE_ID.test(segments[0]);
        case 'vimeo.com':
            if (segments.length === 1) return VIMEO_ID.test(segments[0]);
            if (segments.length === 2) return VIMEO_ID.test(segments[0]) && VIMEO_HASH.test(segments[1]);
            if (segments.length === 3) return segments[0] === 'channels' && VIMEO_ID.test(segments[2]);
            return segments.length === 4 && segments[0] === 'groups' && segments[2] === 'videos' && VIMEO_ID.test(segments[3]);
        default:
            return false;
    }
}

/** What the player may frame for an external video: the server's normalised embed URL, nothing else. */
export function isVideoEmbedUrl(value: string): boolean {
    const url = parseHttpsLike(value, false);
    if (!url) return false;
    const segments = url.pathname.split('/').filter(Boolean);
    const host = url.hostname.toLowerCase();
    if (host === 'www.youtube-nocookie.com' || host === 'youtube-nocookie.com') {
        return segments.length === 2 && segments[0] === 'embed' && YOUTUBE_ID.test(segments[1]);
    }
    return host === 'player.vimeo.com' && segments.length === 2 && segments[0] === 'video' && VIMEO_ID.test(segments[1]);
}

/**
 * A Google document an admin may paste for a DOCUMENT lesson (contract, Addendum 2): https only, a
 * Docs, Slides or Sheets file on docs.google.com, or a Drive file (drive.google.com/file/d/ID).
 */
/** Same rule as the backend's TrainingDocumentUrls.FILE_ID. */
const GOOGLE_FILE_ID = /^[A-Za-z0-9_-]{20,200}$/;

export function isSupportedDocumentLink(value: string): boolean {
    const url = parseHttpsLike(value, false);
    if (!url) return false;
    const segments = url.pathname.split('/').filter(Boolean);
    switch (url.hostname.toLowerCase()) {
        case 'docs.google.com':
            return segments.length >= 3 && ['document', 'presentation', 'spreadsheets'].includes(segments[0]) && segments[1] === 'd' && GOOGLE_FILE_ID.test(segments[2]);
        case 'drive.google.com':
            return segments.length >= 3 && segments[0] === 'file' && segments[1] === 'd' && GOOGLE_FILE_ID.test(segments[2]);
        default:
            return false;
    }
}

/** What the stage may frame for an EMBED document: an https page on docs.google.com or drive.google.com. */
export function isDocumentEmbedUrl(value: string): boolean {
    const url = parseHttpsLike(value, false);
    return url !== null && ['docs.google.com', 'drive.google.com'].includes(url.hostname.toLowerCase());
}

// --- PDF reader -------------------------------------------------------------------------------------

export const PDF_ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;

/** The next zoom step up or down from the current factor (1 = fit width), clamped to the list. */
export function nextPdfZoom(current: number, direction: 'in' | 'out'): number {
    if (direction === 'in') return PDF_ZOOM_STEPS.find(step => step > current + 1e-6) ?? PDF_ZOOM_STEPS[PDF_ZOOM_STEPS.length - 1];
    return [...PDF_ZOOM_STEPS].reverse().find(step => step < current - 1e-6) ?? PDF_ZOOM_STEPS[0];
}

/** A typed or stored page number as a valid page (1-based), or null when it is not a number. */
export function clampPdfPage(value: number | string | null | undefined, pageCount: number): number | null {
    const page = typeof value === 'string' ? Number(value.trim() || Number.NaN) : value;
    if (typeof page !== 'number' || !Number.isFinite(page) || pageCount <= 0) return null;
    return Math.min(Math.max(Math.trunc(page), 1), pageCount);
}

/** Move one item up or down; out-of-range moves return the list unchanged (same reference). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items as T[];
    const next = items.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

/** Evenly spaced sort orders (10, 20, 30 …) for a list in its new order. */
export function respacedSortOrders(count: number, step = 10): number[] {
    return Array.from({length: count}, (_, index) => (index + 1) * step);
}

export const LESSON_TYPE_LABELS: Record<TrainingLessonType, string> = {
    VIDEO: 'Video',
    SLIDES: 'Slide',
    ARTICLE: 'Bài đọc',
    DOCUMENT: 'Tài liệu',
};

/** "1.5 MB", "820 KB", "12 B" (decimal units, as the upload limits). Missing or invalid sizes → "". */
export function formatFileSize(bytes: number | null | undefined): string {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '';
    if (bytes >= 1000 * 1000) {
        const mb = bytes / (1000 * 1000);
        return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
    }
    if (bytes >= 1000) return `${Math.round(bytes / 1000)} KB`;
    return `${Math.round(bytes)} B`;
}
