'use client';
import {useState} from 'react';
import {useQueries} from '@tanstack/react-query';
import {X} from 'lucide-react';
import {customerService} from '@/lib/api/customer';
import {useCustomerScope} from '@/lib/query/customer';
import type {MissionMedia} from '@/types/customer';
import {useI18n} from '@/contexts/I18nContext';

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
        <ul className="media-preview" aria-label={t('media.previewLabel')}>{images.map((item, index) => {
            const url = urls[index]?.data?.url;
            return <li key={item.id}>
                <button type="button" onClick={() => setOpen(item.media.id)} disabled={!url}
                        aria-label={t('media.viewImage', {name: item.media.originalName})}>
                    {url ? <img src={url} alt={item.media.originalName} loading="lazy"/> :
                        <span>{urls[index]?.isError ? t('media.loadFailed') : t('media.loading')}</span>}
                </button>
            </li>;
        })}</ul>
        {active != null && active >= 0 && urls[active]?.data?.url &&
            <div className="media-lightbox" role="dialog" aria-modal="true" aria-label={images[active].media.originalName}
                 onClick={() => setOpen(null)} onKeyDown={event => event.key === 'Escape' && setOpen(null)}>
                <button type="button" className="icon-button" aria-label={t('common.close')} autoFocus
                        onClick={() => setOpen(null)}><X size={20}/></button>
                <img src={urls[active].data!.url} alt={images[active].media.originalName}
                     onClick={event => event.stopPropagation()}/>
                <p>{images[active].media.originalName}</p>
            </div>}
    </>;
}
