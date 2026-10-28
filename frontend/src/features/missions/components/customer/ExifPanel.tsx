'use client';
import {useQuery} from '@tanstack/react-query';
import {useI18n} from '@/contexts/I18nContext';
import type {ExifMetadata as Exif} from '@/features/missions/types/mission.types';

const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value
    : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined;

/**
 * Capture metadata read in the browser from the signed URL (EXIF, GPS and DJI XMP gimbal tags).
 * Needs the storage bucket to allow cross-origin reads; otherwise it reports that metadata is unavailable.
 */
export function ExifPanel({url, cacheKey}: { url: string; cacheKey: number }) {
    const {t, formatNumber, formatDate} = useI18n();
    const exif = useQuery({
        queryKey: ['media-exif', cacheKey],
        queryFn: async () => {
            const exifr = (await import('exifr')).default;
            return (await exifr.parse(url, {tiff: true, exif: true, gps: true, xmp: true})) as Exif | undefined ?? null;
        },
        staleTime: Infinity,
        retry: false,
    });
    const n = (value: unknown, digits = 1) => {
        const parsed = num(value);
        return parsed == null ? undefined : formatNumber(parsed, {maximumFractionDigits: digits});
    };
    const data = exif.data;
    const taken = data?.DateTimeOriginal instanceof Date ? formatDate(data.DateTimeOriginal) : undefined;
    const rows: [string, string | undefined][] = data ? [
        [t('exif.taken'), taken],
        [t('exif.camera'), [data.Make, data.Model].filter(Boolean).join(' ') || undefined],
        [t('exif.position'), data.latitude != null && data.longitude != null ? `${n(data.latitude, 6)}, ${n(data.longitude, 6)}` : undefined],
        [t('exif.altitude'), n(data.GPSAltitude) && t('exif.meters', {value: n(data.GPSAltitude)!})],
        [t('exif.relativeAltitude'), n(data.RelativeAltitude) && t('exif.meters', {value: n(data.RelativeAltitude)!})],
        [t('exif.gimbal'), [data.GimbalPitchDegree, data.GimbalYawDegree, data.GimbalRollDegree].some(v => num(v) != null)
            ? t('exif.gimbalValue', {pitch: n(data.GimbalPitchDegree) ?? '—', yaw: n(data.GimbalYawDegree) ?? '—', roll: n(data.GimbalRollDegree) ?? '—'})
            : undefined],
        [t('exif.heading'), n(data.FlightYawDegree) && `${n(data.FlightYawDegree)}°`],
        [t('exif.size'), num(data.ExifImageWidth) && num(data.ExifImageHeight) ? `${data.ExifImageWidth} × ${data.ExifImageHeight}` : undefined],
    ] : [];
    const shown = rows.filter((row): row is [string, string] => !!row[1]);
    const mapLink = data?.latitude != null && data?.longitude != null
        ? `https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}#map=17/${data.latitude}/${data.longitude}` : undefined;

    return <aside className="w-full max-w-sm rounded-panel bg-black/50 p-4 text-sm" aria-label={t('exif.title')}
                  onClick={event => event.stopPropagation()}>
        <h3 className="m-0 mb-3 text-sm font-bold">{t('exif.title')}</h3>
        {exif.isPending ? <p className="m-0 text-white/70" role="status">{t('common.loading')}</p>
            : exif.isError ? <p className="m-0 text-white/70">{t('exif.unavailable')}</p>
                : !shown.length ? <p className="m-0 text-white/70">{t('exif.none')}</p>
                    : <dl className="m-0 grid gap-2">{shown.map(([label, value]) => <div key={label} className="grid gap-0.5">
                        <dt className="text-xs text-white/60">{label}</dt>
                        <dd className="m-0 break-words tabular-nums">{value}</dd>
                    </div>)}</dl>}
        {mapLink && <a href={mapLink} target="_blank" rel="noopener noreferrer"
                       className="mt-3 inline-block text-xs font-semibold text-white underline">{t('exif.openMap')}</a>}
    </aside>;
}
