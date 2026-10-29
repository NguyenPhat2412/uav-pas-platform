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
export const TRAINING_VIDEO_MAX_BYTES = 500 * 1000 * 1000;
export const TRAINING_IMAGE_MAX_BYTES = 10 * 1000 * 1000;
export const TRAINING_PDF_MAX_BYTES = 50 * 1000 * 1000;

/** `pdf`: a DOCUMENT lesson's guide. `resource`: a lesson attachment, a PDF or an image. */
export type TrainingAssetKind = 'video' | 'image' | 'pdf' | 'resource';

/** The size limit for one file of this kind, by its MIME type; null when the type is not accepted. */
export function trainingAssetMaxBytes(contentType: string, kind: TrainingAssetKind): number | null {
    const isImage = (TRAINING_IMAGE_TYPES as readonly string[]).includes(contentType);
    const isPdf = contentType === TRAINING_PDF_TYPE;
    switch (kind) {
        case 'video': return (TRAINING_VIDEO_TYPES as readonly string[]).includes(contentType) ? TRAINING_VIDEO_MAX_BYTES : null;
        case 'image': return isImage ? TRAINING_IMAGE_MAX_BYTES : null;
        case 'pdf': return isPdf ? TRAINING_PDF_MAX_BYTES : null;
        case 'resource': return isPdf ? TRAINING_PDF_MAX_BYTES : isImage ? TRAINING_IMAGE_MAX_BYTES : null;
    }
}

/** Client-side check before asking for an upload URL; the server enforces the same limits. */
export function trainingAssetError(file: {type: string; size: number}, kind: TrainingAssetKind): 'type' | 'size' | null {
    const max = trainingAssetMaxBytes(file.type, kind);
    if (max === null) return 'type';
    if (file.size <= 0 || file.size > max) return 'size';
    return null;
}

/** What a downloadable file looks like in the resource lists: picks the icon. */
export function resourceFileKind(contentType: string | null | undefined): 'pdf' | 'image' | 'file' {
    if (contentType === TRAINING_PDF_TYPE) return 'pdf';
    return contentType?.startsWith('image/') ? 'image' : 'file';
}

/** The title an attachment gets by default: the file name without its extension. */
export function defaultResourceTitle(fileName: string): string {
    const trimmed = fileName.trim();
    const dot = trimmed.lastIndexOf('.');
    return dot > 0 ? trimmed.slice(0, dot) : trimmed;
}

/** Lessons done and total, and the 0–100 share, for the player's progress ring. */
export function courseLessonProgress(sections: readonly TrainingCourseSection[]): {done: number; total: number; percent: number} {
    const lessons = flattenLessons(sections);
    const done = lessons.filter(lesson => lesson.completed).length;
    return {done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0};
}

/** Only YouTube and Vimeo links are accepted (the server turns them into embed URLs). */
export function isSupportedVideoLink(value: string): boolean {
    let url: URL;
    try {
        url = new URL(value.trim());
    } catch {
        return false;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    return ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'vimeo.com', 'player.vimeo.com'].includes(host);
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
    DOCUMENT: 'Tài liệu PDF',
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
