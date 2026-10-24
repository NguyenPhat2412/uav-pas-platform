'use client';
import {FileText, Film, Image as ImageIcon, Paperclip} from 'lucide-react';
import {Button} from '@/components/customer/ui';
import {useI18n} from '@/contexts/I18nContext';
import type {MissionMedia} from '@/types/customer';

// Handover results first, then raw flight data, documents and anything the customer supplied.
const GROUPS = [
    {key: 'OUTPUT', roles: ['OUTPUT']},
    {key: 'FLIGHT_DATA', roles: ['FLIGHT_DATA']},
    {key: 'DOCUMENT', roles: ['DOCUMENT']},
    {key: 'INPUT', roles: ['INPUT', 'OTHER']},
] as const;

function kind(contentType?: string) {
    if (contentType?.startsWith('image/')) return {icon: ImageIcon, key: 'image'};
    if (contentType?.startsWith('video/')) return {icon: Film, key: 'video'};
    if (contentType === 'application/pdf') return {icon: FileText, key: 'pdf'};
    return {icon: Paperclip, key: 'other'};
}

export function MissionFiles({items, downloading, onDownload}: {
    items: MissionMedia[];
    downloading: number | null;
    onDownload: (mediaId: number) => void;
}) {
    const {t, formatNumber, formatDate} = useI18n();
    const size = (bytes: number) => bytes >= 1e9 ? `${formatNumber(bytes / 1e9, {maximumFractionDigits: 2})} GB`
        : bytes >= 1e6 ? `${formatNumber(bytes / 1e6, {maximumFractionDigits: 1})} MB`
            : `${formatNumber(Math.max(1, Math.ceil(bytes / 1000)))} KB`;
    const known: string[] = GROUPS.flatMap(group => [...group.roles]);
    const groups = GROUPS.map(group => ({
        ...group,
        // Unknown roles fall into the last group so nothing is hidden.
        files: items.filter(item => (group.roles as readonly string[]).includes(item.mediaRole)
            || (group.key === 'INPUT' && !known.includes(item.mediaRole))),
    })).filter(group => group.files.length);

    return <div className="grid gap-5">{groups.map(group => <section key={group.key} aria-labelledby={`files-${group.key}`}>
        <h3 id={`files-${group.key}`} className="m-0 mb-2 flex items-center justify-between text-sm font-bold text-foreground">
            {t(`files.groups.${group.key}`)}
            <span className="text-xs font-semibold text-muted">{t('missionDetail.fileCount', {count: group.files.length})}</span>
        </h3>
        <ul className="m-0 grid list-none gap-2 p-0">{group.files.map(item => {
            const type = kind(item.media.contentType);
            const Icon = type.icon;
            return <li key={item.id} className="mission-file flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-muted" aria-hidden="true"><Icon size={18}/></span>
                    <div className="grid min-w-0 gap-0.5">
                        <span className="break-words text-sm font-semibold text-foreground">{item.media.originalName}</span>
                        <span className="text-xs text-muted">{t(`files.kinds.${type.key}`)} · {size(item.media.size)}
                            {item.createdAt && ` · ${formatDate(item.createdAt, {dateStyle: 'short'})}`}</span>
                    </div>
                </div>
                <Button variant="secondary" disabled={downloading !== null}
                        onClick={() => onDownload(item.media.id)}>{downloading === item.media.id ? t('missionDetail.downloading') : t('missionDetail.download')}</Button>
            </li>;
        })}</ul>
    </section>)}</div>;
}
