'use client';
import {useState} from 'react';
import {cn} from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/** Stored avatar paths are API-relative (/api/v1/users/{id}/avatar?v=…); other URLs pass through. */
export function avatarSrc(url?: string | null): string | undefined {
    if (!url) return undefined;
    return url.startsWith('/api/') ? `${API_BASE}${url}` : url;
}

export function initialsOf(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || '?';
}

/** Round avatar with an initials fallback while loading fails or when no picture is set. */
export function Avatar({name, avatarUrl, size = 28, className}: {
    name: string; avatarUrl?: string | null; size?: number; className?: string;
}) {
    const src = avatarSrc(avatarUrl);
    const [failed, setFailed] = useState<string | undefined>();
    const showImage = src && failed !== src;
    return <span aria-hidden="true"
                 className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-primary-foreground', className)}
                 style={{width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38))}}>
        {showImage ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(src)}/> : initialsOf(name)}
    </span>;
}
