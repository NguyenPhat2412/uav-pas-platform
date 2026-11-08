'use client';

import {Database, FileCheck2, FileClock, FileWarning, Trash2} from 'lucide-react';
import {Alert, Badge, Button, Card, CardContent, KpiCard, MetricStrip} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {useDeleteFile} from '@/hooks/storage/useAdminFiles';
import type {StoredFile, StoredFileSummary} from '@/types/storage/files.types';
import {formatFileSize, sharePercent} from '@/utils/storage/files';

export function AdminFileSummaryCard({data}: { data: StoredFileSummary }) {
    const {t, formatNumber} = useI18n();
    const size = (bytes: number) => formatFileSize(bytes, formatNumber);
    const files = (count: number) => t('admin.files.tiles.files', {count: formatNumber(count)});
    const modules = [...data.byModule].sort((a, b) => b.bytes - a.bytes);
    const widest = modules[0]?.bytes ?? 0;

    return (
        <div className="space-y-3">
            <MetricStrip>
                <KpiCard
                    label={t('admin.files.tiles.total')}
                    value={size(data.total.bytes)}
                    icon={<Database size={16} aria-hidden="true"/>}
                    tone="red"
                />
                <KpiCard
                    label={t('admin.files.tiles.count')}
                    value={formatNumber(data.total.count)}
                    icon={<FileCheck2 size={16} aria-hidden="true"/>}
                    tone="blue"
                />
                <KpiCard
                    label={t('admin.files.tiles.unused')}
                    value={size(data.unused.bytes)}
                    meta={files(data.unused.count)}
                    icon={<FileWarning size={16} aria-hidden="true"/>}
                    tone={data.unused.count > 0 ? 'amber' : 'slate'}
                />
                <KpiCard
                    label={t('admin.files.tiles.pending')}
                    value={size(data.pending.bytes)}
                    meta={files(data.pending.count)}
                    icon={<FileClock size={16} aria-hidden="true"/>}
                    tone="slate"
                />
            </MetricStrip>

            {modules.length > 0 && (
                <Card>
                    <CardContent className="px-4 py-3">
                        <h3 className="m-0 mb-2.5 text-[13px] font-bold text-slate-900">{t('admin.files.byModule')}</h3>
                        <ul className="m-0 grid list-none gap-x-6 gap-y-2.5 p-0 md:grid-cols-2">
                            {modules.map(m => (
                                <li key={m.module} className="min-w-0">
                                    <div className="flex items-center justify-between gap-3 text-[13px]">
                                        <span className="truncate font-semibold text-slate-800">{t(`admin.files.module.${m.module}`)}</span>
                                        <Badge variant="outline" size="sm" className="tabular-nums normal-case">
                                            {size(m.bytes)}
                                        </Badge>
                                    </div>
                                    <div className="mt-1 h-1.5 bg-slate-100" aria-hidden="true">
                                        <div className="h-full bg-slate-500" style={{width: `${sharePercent(m.bytes, widest)}%`}}/>
                                    </div>
                                    <span className="mt-0.5 block text-xs text-slate-500">
                                        {t('admin.files.byModuleDetail', {
                                            count: formatNumber(m.count),
                                            unused: formatNumber(m.unusedCount),
                                            pending: formatNumber(m.pendingCount),
                                        })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export function AdminFileDeleteDialog({file, onClose, onDeleted}: {
    file: StoredFile;
    onClose: () => void;
    onDeleted: () => void;
}) {
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

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4"
            role="presentation"
            onMouseDown={e => e.target === e.currentTarget && close()}
        >
            <Card
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="file-delete-title"
                aria-describedby="file-delete-body"
                onKeyDown={e => e.key === 'Escape' && close()}
                className="flex w-full max-w-md flex-col gap-4 p-5 shadow-2xl sm:p-6"
            >
                <h2 id="file-delete-title" className="m-0 text-lg font-bold text-slate-900">
                    {t('admin.files.confirmTitle')}
                </h2>
                <p id="file-delete-body" className="m-0 break-words text-[13px] text-slate-600">
                    {t('admin.files.confirmBody', {name: file.fileName, size: formatFileSize(file.sizeBytes, formatNumber)})}
                </p>
                {remove.error && (
                    <Alert variant="error" className="p-3 text-[13px]">
                        {remove.error.message || t('admin.files.deleteFailed')}
                    </Alert>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={close} autoFocus disabled={remove.isPending}>
                        {t('admin.files.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        isLoading={remove.isPending}
                        leftIcon={<Trash2 size={14} aria-hidden="true"/>}
                        onClick={() => remove.mutate()}
                    >
                        {t('admin.files.confirmDelete')}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
