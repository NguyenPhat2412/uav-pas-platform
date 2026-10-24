'use client';
import {useState} from 'react';
import {useQueries} from '@tanstack/react-query';
import {X} from 'lucide-react';
import {customerService} from '@/lib/api/customer';
import {useCustomerScope} from '@/lib/query/customer';
import type {MissionMedia} from '@/types/customer';
import {useI18n} from '@/contexts/I18nContext';
import {ExifPanel} from '@/features/missions/components/customer/ExifPanel';

const PREVIEW_LIMIT = 8;
// Signed URLs expire; refresh well before a typical 15-minute validity window.
const URL_STALE_MS = 5 * 60_000;

export function MediaPreview({items}: { items: MissionMedia[] }) {
    const {key} = useCustomerScope();
    const {t} = useI18n();
    const images = items.filter(item => item.media.contentType?.startsWith('image/')).slice(0, PREVIEW_LIMIT);
    const urls = useQueries({
        queries: images.map(item => ({
            queryKey: [...key, 'media-url', item.media.id],
            queryFn: () => customerService.download(item.media.id),
            staleTime: URL_STALE_MS,
        }))
    });
    const [open, setOpen] = useState<number | null>(null);
    if (!images.length) return null;
    const active = open == null ? null : images.findIndex(item => item.media.id === open);
    return <>
        <ul className="m-0 mb-4 grid list-none grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5 p-0" aria-label={t('media.previewLabel')}>{images.map((item, index) => {
            const url = urls[index]?.data?.url;
            return <li key={item.id}>
                <button type="button" className="grid aspect-4/3 w-full cursor-zoom-in place-items-center overflow-hidden rounded-control border border-border bg-background p-0 text-xs text-muted disabled:cursor-default" onClick={() => setOpen(item.media.id)} disabled={!url}
                        aria-label={t('media.viewImage', {name: item.media.originalName})}>
                    {url ? <img src={url} alt={item.media.originalName} loading="lazy" className="h-full w-full object-cover"/> :
                        <span>{urls[index]?.isError ? t('media.loadFailed') : t('media.loading')}</span>}
                </button>
            </li>;
        })}</ul>
        {active != null && active >= 0 && urls[active]?.data?.url &&
            <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 bg-black/80 px-4 pt-12 pb-6 text-white" role="dialog" aria-modal="true" aria-label={images[active].media.originalName}
                 onClick={() => setOpen(null)} onKeyDown={event => event.key === 'Escape' && setOpen(null)}>
                <button type="button" className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-control border border-white/20 bg-white/15 text-white hover:bg-white/25" aria-label={t('common.close')} autoFocus
                        onClick={() => setOpen(null)}><X size={20}/></button>
                <div className="flex max-h-[calc(100vh-80px)] w-full max-w-6xl flex-col items-center gap-4 overflow-y-auto md:flex-row md:items-start md:justify-center">
                    <div className="flex min-w-0 flex-col items-center gap-3">
                        <img src={urls[active].data!.url} alt={images[active].media.originalName}
                             className="max-h-[calc(100vh-140px)] max-w-full rounded-panel object-contain"
                             onClick={event => event.stopPropagation()}/>
                        <p className="m-0 text-sm">{images[active].media.originalName}</p>
                    </div>
                    <ExifPanel url={urls[active].data!.url} cacheKey={images[active].media.id}/>
                </div>
            </div>}
    </>;
}
