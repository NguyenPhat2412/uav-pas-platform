'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Eraser,
    ExternalLink,
    File as FileIcon,
    FileImage,
    FileText,
    FileVideo,
    RefreshCw,
    Search,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {QueryState} from '@/components/data/WorkspaceState';
import {Pagination} from '@/components/data/Pagination';
import {FilterSelect} from '@/components/shared/FilterSelect';
import {cn} from '@/lib/utils';
import {useDeleteFile, useFileList, useFileSummary, useOpenStoredFile, useRefreshFiles} from '../hooks/useAdminFiles';
import type {FileSortDirection, FileSortField, StoredFile, StoredFileKind, StoredFileModule, StoredFileStatus, StoredFileSummary} from '../types/files.types';
import {
    FILE_KINDS,
    FILE_MODULES,
    FILE_PAGE_SIZE,
    FILE_STATUSES,
    canDeleteFile,
    formatFileSize,
    linkHref,
    nextSort,
    sharePercent,
} from '../utils/files';
import {FileCleanupDialog} from './FileCleanupDialog';

const KIND_ICONS: Record<StoredFileKind, LucideIcon> = {VIDEO: FileVideo, IMAGE: FileImage, DOCUMENT: FileText, OTHER: FileIcon};
const STATUS_STYLE: Record<StoredFileStatus, string> = {
    IN_USE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    UNUSED: 'bg-amber-50 text-amber-800 ring-amber-200',
    PENDING: 'bg-slate-100 text-slate-600 ring-slate-200',
};

type All<T extends string> = T | 'all';

export function StatusBadge({status}: { status: StoredFileStatus }) {
    const {t} = useI18n();
    return <span className={cn('inline-flex items-center whitespace-nowrap px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset', STATUS_STYLE[status])}>
        {t(`admin.files.status.${status}`)}</span>;
}

export function AdminFileManager() {
    const {t} = useI18n();
    const [module, setModule] = useState<All<StoredFileModule>>('all');
    const [kind, setKind] = useState<All<StoredFileKind>>('all');
    const [status, setStatus] = useState<All<StoredFileStatus>>('all');
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(0);
    const [order, setOrder] = useState<{ sort: FileSortField; direction: FileSortDirection }>({sort: 'createdAt', direction: 'desc'});
    const [confirming, setConfirming] = useState<StoredFile | null>(null);
    const [cleaning, setCleaning] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setQ(search.trim());
            setPage(0);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const listQuery = {
        module: module === 'all' ? undefined : module,
        type: kind === 'all' ? undefined : kind,
        status: status === 'all' ? undefined : status,
        q: q || undefined,
        page,
        size: FILE_PAGE_SIZE,
        ...order,
    };
    const summary = useFileSummary();
    const list = useFileList(listQuery);
    const refresh = useRefreshFiles();
    const filter = (apply: () => void) => {
        apply();
        setPage(0);
    };
    const sortBy = (field: FileSortField) => {
        setOrder(current => nextSort(current, field));
        setPage(0);
    };

    return <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
            <p className="m-0 min-w-0 flex-1 basis-64 text-[13px] text-slate-600">{t('admin.files.intro')}</p>
            <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={refresh} disabled={summary.isFetching || list.isFetching}
                        className="inline-flex h-9 items-center gap-1.5 border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    <RefreshCw size={14} className={cn((summary.isFetching || list.isFetching) && 'animate-spin')} aria-hidden="true"/>{t('admin.files.refresh')}
                </button>
                <button type="button" onClick={() => setCleaning(true)}
                        className="inline-flex h-9 items-center gap-1.5 bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:opacity-90">
                    <Eraser size={15} aria-hidden="true"/>{t('admin.files.cleanup.open')}
                </button>
            </div>
        </div>

        <QueryState query={summary}>{summary.data && <SummaryPanel data={summary.data}/>}</QueryState>

        <div className="flex flex-wrap items-center gap-2">
            <FilterSelect label={t('admin.files.filter.module')} value={module} onChange={value => filter(() => setModule(value))}
                          options={(['all', ...FILE_MODULES] as const).map(value => ({value, label: t(`admin.files.module.${value}`)}))}/>
            <FilterSelect label={t('admin.files.filter.type')} value={kind} onChange={value => filter(() => setKind(value))}
                          options={(['all', ...FILE_KINDS] as const).map(value => ({value, label: t(`admin.files.kind.${value}`)}))}/>
            <FilterSelect label={t('admin.files.filter.status')} value={status} onChange={value => filter(() => setStatus(value))}
                          options={(['all', ...FILE_STATUSES] as const).map(value => ({value, label: t(`admin.files.status.${value}`)}))}/>
            <label className="relative w-full sm:w-72">
                <span className="sr-only">{t('admin.files.search')}</span>
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true"/>
                <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.files.search')}
                       className="h-9 w-full border border-slate-200 bg-white pl-9 pr-3 text-[13px] focus:border-primary focus:outline-none"/>
            </label>
        </div>

        <section className="border border-slate-200 bg-white">
            <QueryState query={list}>{list.data?.content.length ? <FileTable files={list.data.content} order={order} onSort={sortBy}
                                                                             onDelete={setConfirming} busy={list.isFetching}/>
                : <p className="px-6 py-12 text-center text-[13px] text-slate-500">{t('admin.files.empty')}</p>}</QueryState>
        </section>
        {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.totalElements} onChange={setPage}/>}
        <p className="text-xs text-slate-500">{t('admin.files.readOnlyNote')}</p>

        {confirming && <DeleteDialog file={confirming} onClose={() => setConfirming(null)} onDeleted={() => {
            setConfirming(null);
            refresh();
        }}/>}
        {cleaning && <FileCleanupDialog onClose={() => {
            setCleaning(false);
            refresh();
        }}/>}
    </div>;
}

function SummaryPanel({data}: { data: StoredFileSummary }) {
    const {t, formatNumber} = useI18n();
    const size = (bytes: number) => formatFileSize(bytes, formatNumber);
    const files = (count: number) => t('admin.files.tiles.files', {count: formatNumber(count)});
    const modules = [...data.byModule].sort((a, b) => b.bytes - a.bytes);
    const widest = modules[0]?.bytes ?? 0;
    return <section className="border border-slate-200 bg-white">
        <div className="grid grid-cols-2 gap-px bg-slate-100 lg:grid-cols-4">
            <Tile label={t('admin.files.tiles.total')} value={size(data.total.bytes)}/>
            <Tile label={t('admin.files.tiles.count')} value={formatNumber(data.total.count)}/>
            <Tile label={t('admin.files.tiles.unused')} value={size(data.unused.bytes)} hint={files(data.unused.count)} warn={data.unused.count > 0}/>
            <Tile label={t('admin.files.tiles.pending')} value={size(data.pending.bytes)} hint={files(data.pending.count)}/>
        </div>
        {modules.length > 0 && <div className="border-t border-slate-100 px-4 py-3">
            <h3 className="m-0 mb-2 text-[13px] font-bold text-slate-900">{t('admin.files.byModule')}</h3>
            <ul className="m-0 grid list-none gap-x-6 gap-y-2.5 p-0 md:grid-cols-2">
                {modules.map(m => <li key={m.module} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="truncate font-semibold text-slate-800">{t(`admin.files.module.${m.module}`)}</span>
                        <span className="shrink-0 tabular-nums text-slate-900">{size(m.bytes)}</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-slate-100" aria-hidden="true">
                        <div className="h-full bg-slate-500" style={{width: `${sharePercent(m.bytes, widest)}%`}}/>
                    </div>
                    <span className="mt-0.5 block text-xs text-slate-500">
                        {t('admin.files.byModuleDetail', {count: formatNumber(m.count), unused: formatNumber(m.unusedCount), pending: formatNumber(m.pendingCount)})}
                    </span>
                </li>)}
            </ul>
        </div>}
    </section>;
}

function Tile({label, value, hint, warn}: { label: string; value: string; hint?: string; warn?: boolean }) {
    return <div className="min-w-0 bg-white px-4 py-3">
        <span className="block text-xs text-slate-500">{label}</span>
        <strong className={cn('mt-0.5 block truncate text-[17px] tabular-nums text-slate-900', warn && 'text-amber-700')}>{value}</strong>
        {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
    </div>;
}

function SortHeader({field, label, order, onSort, className}: {
    field: FileSortField; label: string; order: { sort: FileSortField; direction: FileSortDirection }; onSort: (field: FileSortField) => void; className?: string;
}) {
    const {t} = useI18n();
    const active = order.sort === field;
    const Icon = !active ? ArrowUpDown : order.direction === 'asc' ? ArrowUp : ArrowDown;
    return <th className={cn('px-4 py-3', className)} aria-sort={active ? (order.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => onSort(field)} aria-label={t('admin.files.sortBy', {column: label})}
                className={cn('inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-900', active && 'text-slate-900')}>
            {label}<Icon size={13} aria-hidden="true"/>
        </button>
    </th>;
}

function deleteBlockedReason(file: StoredFile): string {
    if (file.module === 'MISSION_MEDIA') return 'MISSION_MEDIA';
    if (file.status === 'IN_USE') return 'IN_USE';
    return 'UPLOADING';
}

function FileTable({files, order, onSort, onDelete, busy}: {
    files: StoredFile[];
    order: { sort: FileSortField; direction: FileSortDirection };
    onSort: (field: FileSortField) => void;
    onDelete: (file: StoredFile) => void;
    busy: boolean;
}) {
    const {t, formatDate, formatNumber} = useI18n();
    const [opening, setOpening] = useState<string | null>(null);
    const openStoredFile = useOpenStoredFile();
    const open = async (file: StoredFile) => {
        setOpening(file.id);
        await openStoredFile(file, t('admin.files.openFailed'));
        setOpening(null);
    };
    return <div className={cn('overflow-x-auto', busy && 'opacity-70')} tabIndex={0} aria-label={t('admin.files.table')}>
        <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
            <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
                <th className="px-4 py-3">{t('admin.files.col.name')}</th>
                <th className="w-32 px-4 py-3">{t('admin.files.col.module')}</th>
                <th className="w-44 px-4 py-3">{t('admin.files.col.linked')}</th>
                <th className="w-36 px-4 py-3">{t('admin.files.col.owner')}</th>
                <SortHeader field="sizeBytes" label={t('admin.files.col.size')} order={order} onSort={onSort} className="w-28"/>
                <SortHeader field="createdAt" label={t('admin.files.col.created')} order={order} onSort={onSort} className="w-36"/>
                <th className="w-28 px-4 py-3">{t('admin.files.col.status')}</th>
                <th className="w-24 px-4 py-3 text-right">{t('admin.files.col.actions')}</th>
            </tr>
            </thead>
            <tbody>{files.map(file => {
                const Icon = KIND_ICONS[file.kind] ?? FileIcon;
                const href = linkHref(file.linkedTo);
                const deletable = canDeleteFile(file);
                return <tr key={file.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                            <Icon size={18} className="mt-0.5 shrink-0 text-slate-400" aria-label={t(`admin.files.kind.${file.kind}`)}/>
                            <div className="min-w-0">
                                <strong className="block break-all font-semibold text-slate-900">{file.fileName}</strong>
                                <span className="block truncate font-mono text-[11px] text-slate-400" title={file.storageKey}>{file.storageKey}</span>
                            </div>
                        </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t(`admin.files.module.${file.module}`)}</td>
                    <td className="px-4 py-3">{file.linkedTo?.label
                        ? href ? <Link href={href} className="break-words font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600">{file.linkedTo.label}</Link>
                            : <span className="break-words text-slate-700">{file.linkedTo.label}</span>
                        : <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3">{file.owner
                        ? file.owner.id != null ? <Link href={`/admin/users/${file.owner.id}`} className="break-words text-slate-700 hover:underline">{file.owner.name}</Link>
                            : <span className="break-words text-slate-700">{file.owner.name}</span>
                        : <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-800">{formatFileSize(file.sizeBytes, formatNumber)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{file.createdAt ? formatDate(file.createdAt, {dateStyle: 'medium'}) : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={file.status}/></td>
                    <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => void open(file)} disabled={opening === file.id}
                                    aria-label={t('admin.files.open', {name: file.fileName})} title={t('admin.files.open', {name: file.fileName})}
                                    className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50">
                                <ExternalLink size={15} aria-hidden="true"/></button>
                            <button type="button" onClick={() => onDelete(file)} disabled={!deletable}
                                    aria-label={t('admin.files.delete', {name: file.fileName})}
                                    title={deletable ? t('admin.files.delete', {name: file.fileName}) : t(`admin.files.deleteBlocked.${deleteBlockedReason(file)}`)}
                                    className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-500">
                                <Trash2 size={15} aria-hidden="true"/></button>
                        </div>
                    </td>
                </tr>;
            })}</tbody>
        </table>
    </div>;
}

function DeleteDialog({file, onClose, onDeleted}: { file: StoredFile; onClose: () => void; onDeleted: () => void }) {
    const {t, formatNumber} = useI18n();
    const remove = useDeleteFile(file.id, {
        onSuccess: () => {
            toast.success(t('admin.files.deleted', {name: file.fileName}));
            onDeleted();
        },
    });
    const close = () => {
        if (!remove.isPending) onClose();
    };
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
                onMouseDown={e => e.target === e.currentTarget && close()}>
        <div role="alertdialog" aria-modal="true" aria-labelledby="file-delete-title" aria-describedby="file-delete-body"
             onKeyDown={e => e.key === 'Escape' && close()}
             className="flex w-full max-w-md flex-col gap-4 bg-white p-5 shadow-2xl sm:p-6">
            <h2 id="file-delete-title" className="m-0 text-lg font-bold text-slate-900">{t('admin.files.confirmTitle')}</h2>
            <p id="file-delete-body" className="m-0 break-words text-[13px] text-slate-600">
                {t('admin.files.confirmBody', {name: file.fileName, size: formatFileSize(file.sizeBytes, formatNumber)})}</p>
            {remove.error && <p role="alert" className="m-0 border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {remove.error.message || t('admin.files.deleteFailed')}</p>}
            <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={close} autoFocus disabled={remove.isPending}
                        className="inline-flex h-9 items-center border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    {t('admin.files.cancel')}</button>
                <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending}
                        className="inline-flex h-9 items-center gap-1.5 bg-red-600 px-4 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    <Trash2 size={14} aria-hidden="true"/>{t('admin.files.confirmDelete')}</button>
            </div>
        </div>
    </div>;
}
