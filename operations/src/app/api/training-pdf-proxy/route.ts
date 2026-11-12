import type {NextRequest} from 'next/server';

function isAllowedStorageUrl(raw: string | null): URL | null {
    if (!raw) return null;
    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        return null;
    }
    if (parsed.username || parsed.password) return null;
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol === 'https:' && host.endsWith('.r2.cloudflarestorage.com')) {
        return parsed;
    }
    if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        (host === 'localhost' || host === '127.0.0.1')
    ) {
        return parsed;
    }
    return null;
}

/**
 * Same-origin streaming proxy for training PDF assets stored in Cloudflare R2.
 * Forwards HTTP `Range` requests (`206 Partial Content`) so pdf.js can stream 64 KB chunks
 * on demand per page without downloading the entire PDF upfront or hitting bucket CORS blocks.
 */
export async function GET(request: NextRequest) {
    const target = isAllowedStorageUrl(request.nextUrl.searchParams.get('url'));
    if (!target) {
        return new Response('Invalid PDF storage URL', {status: 400});
    }

    const upstreamHeaders = new Headers();
    const range = request.headers.get('range');
    if (range) {
        upstreamHeaders.set('Range', range);
    }

    const upstream = await fetch(target.toString(), {
        method: 'GET',
        headers: upstreamHeaders,
        cache: 'no-store',
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstream.headers.get('content-type') || 'application/pdf');
    responseHeaders.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
    responseHeaders.set('Cache-Control', 'private, max-age=300');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
        responseHeaders.set('Content-Length', contentLength);
    }
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) {
        responseHeaders.set('Content-Range', contentRange);
    }

    return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
    });
}
