'use client';
/* eslint-disable @next/next/no-img-element -- mission images use signed storage URLs (R2, minutes-long expiry); they are not next/image remote patterns, so the browser loads them directly. */

import {useState} from 'react';
import {X} from 'lucide-react';
import {ExifPanel} from '@/components/mission/customer/ExifPanel';
import {Button, Card} from '@/components/ui';
import {useMediaDownloadUrls} from '@/hooks/media/useMedia';
import {useI18n} from '@/providers/I18nContext';
import type {MissionMedia} from '@/types/customer';

const PREVIEW_LIMIT = 8;

export function MediaPreview({items}: { items: MissionMedia[] }) {
    const {t} = useI18n();
    const images = items.filter(item => item.media.contentType?.startsWith('image/')).slice(0, PREVIEW_LIMIT);
    const urls = useMediaDownloadUrls(images.map(item => item.media.id));
    const [open, setOpen] = useState<number | null>(null);
    if (!images.length) return null;
    const active = open == null ? null : images.findIndex(item => item.media.id === open);

    return (
        <>
            <ul className="m-0 mb-4 grid list-none grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5 p-0" aria-label={t('media.previewLabel')}>
                {images.map((item, index) => {
                    const url = urls[index]?.data?.url;
                    return (
                        <li key={item.id}>
                            <Card className="rounded-control border-border bg-background">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="grid aspect-4/3 h-auto w-full cursor-zoom-in place-items-center overflow-hidden rounded-none p-0 text-xs font-normal text-muted hover:bg-transparent disabled:cursor-default"
                                    onClick={() => setOpen(item.media.id)}
                                    disabled={!url}
                                    aria-label={t('media.viewImage', {name: item.media.originalName})}
                                >
                                    {url ? (
                                        <img src={url} alt={item.media.originalName} loading="lazy" className="h-full w-full object-cover"/>
                                    ) : (
                                        <span>{urls[index]?.isError ? t('media.loadFailed') : t('media.loading')}</span>
                                    )}
                                </Button>
                            </Card>
                        </li>
                    );
                })}
            </ul>
            {active != null && active >= 0 && urls[active]?.data?.url && (
                <div
                    className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 bg-black/80 px-4 pt-12 pb-6 text-white"
                    role="dialog"
                    aria-modal="true"
                    aria-label={images[active].media.originalName}
                    onClick={() => setOpen(null)}
                    onKeyDown={event => event.key === 'Escape' && setOpen(null)}
                >
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-3 right-3 size-11 border border-white/20 bg-white/15 p-0 text-white hover:bg-white/25"
                        aria-label={t('common.close')}
                        autoFocus
                        onClick={() => setOpen(null)}
                    >
                        <X size={20}/>
                    </Button>
                    <div className="flex max-h-[calc(100vh-80px)] w-full max-w-6xl flex-col items-center gap-4 overflow-y-auto md:flex-row md:items-start md:justify-center">
                        <div className="flex min-w-0 flex-col items-center gap-3">
                            <img
                                src={urls[active].data!.url}
                                alt={images[active].media.originalName}
                                className="max-h-[calc(100vh-140px)] max-w-full rounded-panel object-contain"
                                onClick={event => event.stopPropagation()}
                            />
                            <p className="m-0 text-sm">{images[active].media.originalName}</p>
                        </div>
                        <ExifPanel url={urls[active].data!.url} cacheKey={images[active].media.id}/>
                    </div>
                </div>
            )}
        </>
    );
}
