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

/**
 * Routes cross-origin R2 signed URLs through our same-origin `/api/training-pdf-proxy` endpoint so
 * pdf.js can stream 64 KB HTTP Range chunks per page without hitting storage CORS restrictions.
 */
export function resolvePdfDocumentUrl(url: string): string {
    try {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const parsed = new URL(url, origin);
        const host = parsed.hostname.toLowerCase();
        const isR2 = parsed.protocol === 'https:' && host.endsWith('.r2.cloudflarestorage.com');
        const isLocalBackendAsset =
            (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
            (host === 'localhost' || host === '127.0.0.1') &&
            parsed.origin !== origin &&
            parsed.pathname.includes('/api/v1/training/assets/');
        if (isR2 || isLocalBackendAsset) {
            return `/api/training-pdf-proxy?url=${encodeURIComponent(parsed.toString())}`;
        }
    } catch {
        // Keep the original URL if parsing fails.
    }
    return url;
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
/** Horizontal padding around the book/page inside the stage. */
export const STAGE_PADDING = 32;
/** Spine width between left and right pages in 2-page book mode. */
export const BOOK_SPINE_GAP = 16;
/** 64 KB range chunks so pdf.js loads only the current page on demand instead of the whole PDF. */
export const PDF_RANGE_CHUNK_SIZE = 65_536;
/** Width of lazy-rendered page thumbnails in the PDF strip. */
export const THUMB_WIDTH = 56;

export function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
