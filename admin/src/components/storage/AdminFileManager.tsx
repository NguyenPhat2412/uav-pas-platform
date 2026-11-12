'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {
    ArrowDown, ArrowUp, ArrowUpDown, Eraser, ExternalLink, File as FileIcon,
    FileImage, FileText, FileVideo, RefreshCw, Search, Trash2, type LucideIcon,
} from 'lucide-react';
import {Alert, Badge, type BadgeProps, Button, Card, FormField, Input, Select} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {QueryState} from '@/components/data/WorkspaceState';
import {Pagination} from '@/components/data/Pagination';
import {cn} from '@/lib/utils';
import {useFileList, useFileSummary, useOpenStoredFile, useRefreshFiles} from '@/hooks/storage/useAdminFiles';
import type {FileSortDirection, FileSortField, StoredFile, StoredFileKind, StoredFileModule, StoredFileStatus} from '@/types/storage/files.types';
import {FILE_KINDS, FILE_MODULES, FILE_PAGE_SIZE, FILE_STATUSES, canDeleteFile, formatFileSize, linkHref, nextSort} from '@/utils/storage/files';
import {AdminFileDeleteDialog, AdminFileSummaryCard} from './AdminFileDetailCard';
import {FileCleanupDialog} from './FileCleanupDialog';

const KIND_ICONS: Record<StoredFileKind, LucideIcon> = {VIDEO: FileVideo, IMAGE: FileImage, DOCUMENT: FileText, OTHER: FileIcon};
const STATUS_VARIANT: Record<StoredFileStatus, NonNullable<BadgeProps['variant']>> = {
    IN_USE: 'success',
    UNUSED: 'warning',
    PENDING: 'default',
};

type All<T extends string> = T | 'all';

export function StatusBadge({status}: { status: StoredFileStatus }) {
    const {t} = useI18n();
    return <Badge variant={STATUS_VARIANT[status]} size="sm" className="whitespace-nowrap">{t(`admin.files.status.${status}`)}</Badge>;
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
    const busy = summary.isFetching || list.isFetching;
    const filter = (apply: () => void) => {
        apply();
        setPage(0);
    };
    const sortBy = (field: FileSortField) => {
        setOrder(current => nextSort(current, field));
        setPage(0);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start gap-3">
                <p className="m-0 min-w-0 flex-1 basis-64 text-[13px] text-slate-600">{t('admin.files.intro')}</p>
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={busy}
                            leftIcon={<RefreshCw size={14} className={cn(busy && 'animate-spin')} aria-hidden="true"/>}>
                        {t('admin.files.refresh')}
                    </Button>
                    <Button type="button" variant="primary" size="sm" onClick={() => setCleaning(true)}
                            leftIcon={<Eraser size={15} aria-hidden="true"/>}>
                        {t('admin.files.cleanup.open')}
                    </Button>
                </div>
            </div>

            <QueryState query={summary}>{summary.data && <AdminFileSummaryCard data={summary.data}/>}</QueryState>

            <Card className="p-3.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField id="file-filter-module" label={t('admin.files.filter.module')} optional={false}>
                        <Select id="file-filter-module" value={module} className="h-9 text-[13px]"
                                onChange={e => filter(() => setModule(e.target.value as All<StoredFileModule>))}>
                            {(['all', ...FILE_MODULES] as const).map(v => <option key={v} value={v}>{t(`admin.files.module.${v}`)}</option>)}
                        </Select>
                    </FormField>
                    <FormField id="file-filter-kind" label={t('admin.files.filter.type')} optional={false}>
                        <Select id="file-filter-kind" value={kind} className="h-9 text-[13px]"
                                onChange={e => filter(() => setKind(e.target.value as All<StoredFileKind>))}>
                            {(['all', ...FILE_KINDS] as const).map(v => <option key={v} value={v}>{t(`admin.files.kind.${v}`)}</option>)}
                        </Select>
                    </FormField>
                    <FormField id="file-filter-status" label={t('admin.files.filter.status')} optional={false}>
                        <Select id="file-filter-status" value={status} className="h-9 text-[13px]"
                                onChange={e => filter(() => setStatus(e.target.value as All<StoredFileStatus>))}>
                            {(['all', ...FILE_STATUSES] as const).map(v => <option key={v} value={v}>{t(`admin.files.status.${v}`)}</option>)}
                        </Select>
                    </FormField>
                    <FormField id="file-filter-search" label={t('admin.files.search')} optional={false}>
                        <Input id="file-filter-search" type="search" value={search} onChange={e => setSearch(e.target.value)}
                               placeholder={t('admin.files.search')} leftIcon={<Search size={15} aria-hidden="true"/>} className="h-9 text-[13px]"/>
                    </FormField>
                </div>
            </Card>

            <Card>
                <QueryState query={list}>
                    {list.data?.content.length
                        ? <FileTable files={list.data.content} order={order} onSort={sortBy} onDelete={setConfirming} busy={list.isFetching}/>
                        : <p className="px-6 py-12 text-center text-[13px] text-slate-500">{t('admin.files.empty')}</p>}
                </QueryState>
            </Card>

            {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.totalElements} onChange={setPage}/>}
            <Alert variant="info" className="py-2.5 text-xs">{t('admin.files.readOnlyNote')}</Alert>

            {confirming && <AdminFileDeleteDialog file={confirming} onClose={() => setConfirming(null)} onDeleted={() => {
                setConfirming(null);
                refresh();
            }}/>}
            {cleaning && <FileCleanupDialog onClose={() => {
                setCleaning(false);
                refresh();
            }}/>}
        </div>
    );
}

function SortHeader({field, label, order, onSort, className}: {
    field: FileSortField; label: string; order: { sort: FileSortField; direction: FileSortDirection }; onSort: (field: FileSortField) => void; className?: string;
}) {
    const {t} = useI18n();
    const active = order.sort === field;
    const Icon = !active ? ArrowUpDown : order.direction === 'asc' ? ArrowUp : ArrowDown;
    return (
        <th className={cn('px-4 py-3', className)} aria-sort={active ? (order.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button type="button" onClick={() => onSort(field)} aria-label={t('admin.files.sortBy', {column: label})}
                    className={cn('inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-900', active && 'text-slate-900')}>
                {label}<Icon size={13} aria-hidden="true"/>
            </button>
        </th>
    );
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
    return (
        <div className={cn('overflow-x-auto', busy && 'opacity-70')} tabIndex={0} aria-label={t('admin.files.table')}>
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
                    return (
                        <tr key={file.id} className="border-t border-slate-100 align-top">
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
                                    <Button type="button" variant="ghost" size="sm" onClick={() => void open(file)} disabled={opening === file.id}
                                            aria-label={t('admin.files.open', {name: file.fileName})} title={t('admin.files.open', {name: file.fileName})}
                                            className="h-8 w-8 px-0 text-slate-500 hover:text-slate-900">
                                        <ExternalLink size={15} aria-hidden="true"/>
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(file)} disabled={!deletable}
                                            aria-label={t('admin.files.delete', {name: file.fileName})}
                                            title={deletable ? t('admin.files.delete', {name: file.fileName}) : t(`admin.files.deleteBlocked.${deleteBlockedReason(file)}`)}
                                            className="h-8 w-8 px-0 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-35">
                                        <Trash2 size={15} aria-hidden="true"/>
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    );
                })}</tbody>
            </table>
        </div>
    );
}
