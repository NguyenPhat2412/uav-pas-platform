import {clampPdfPage} from '@/utils/training/course-helpers';

type PdfJs = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfJs> | null = null;

/**
 * pdf.js, fetched on first use only so it stays out of every other bundle. The legacy build carries
 * the polyfills older Safari and Android browsers need. The worker is referenced with
 * `new URL(…, import.meta.url)`, which both Turbopack and webpack turn into a hashed file under
 * /_next/static, so it loads from our own origin in dev and in production builds alike.
 */
export function loadPdfjs(): Promise<PdfJs> {
    pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs')
        .then(pdfjs => {
            pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
            return pdfjs;
        })
        .catch(error => {
            pdfjsPromise = null;
            throw error;
        });
    return pdfjsPromise;
}

const PAGE_STORAGE_PREFIX = 'uav-training-pdf-page:';

export function readStoredPage(storageKey: string, pageCount: number): number | null {
    try {
        return clampPdfPage(window.localStorage.getItem(PAGE_STORAGE_PREFIX + storageKey), pageCount);
    } catch {
        return null;
    }
}

export function storePage(storageKey: string, page: number) {
    try {
        window.localStorage.setItem(PAGE_STORAGE_PREFIX + storageKey, String(page));
    } catch {
        // Private mode or blocked storage: the reader simply starts at page 1 next time.
    }
}

/** Browsers refuse canvases much past ~16 megapixels (iOS especially); stay under that when zoomed. */
export const MAX_CANVAS_PIXELS = 16_000_000;
/** Horizontal padding around the page inside the stage (p-3 on both sides). */
export const STAGE_PADDING = 24;
/** Width of lazy-rendered page thumbnails in the PDF strip. */
export const THUMB_WIDTH = 56;

export function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
