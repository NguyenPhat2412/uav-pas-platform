'use client';

import {useMemo, useRef, useState} from 'react';
import {Trash2, X} from 'lucide-react';
import {Alert, Badge, Button, Card, CardFooter, CardHeader, CardTitle, Spinner} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {QueryState} from '@/components/data/WorkspaceState';
import type {StoredFile} from '@/types/storage/files.types';
import {formatFileSize, totalBytes} from '@/utils/storage/files';
import {useCleanupCandidates, useRemoveFile} from '@/hooks/storage/useAdminFiles';
import {StatusBadge} from './AdminFileManager';

type Phase = 'select' | 'confirm' | 'running' | 'done';

/**
 * "Dọn tệp không dùng": lists every deletable UNUSED / PENDING file, lets the admin pick them, confirms, then
 * deletes one file at a time so progress is visible and one failure never stops the rest.
 */
export function FileCleanupDialog({onClose}: { onClose: () => void }) {
    const {t, formatNumber} = useI18n();
    const candidates = useCleanupCandidates();
    const removeFile = useRemoveFile();
    const files = useMemo(() => candidates.data?.files ?? [], [candidates.data]);
    const [selected, setSelected] = useState<Set<string> | null>(null);
    const chosen = selected ?? new Set(files.map(f => f.id));
    const picked = files.filter(f => chosen.has(f.id));
    const [phase, setPhase] = useState<Phase>('select');
    const [done, setDone] = useState(0);
    const [failures, setFailures] = useState<{ file: StoredFile; message: string }[]>([]);
    const stopped = useRef(false);
    const size = (bytes: number) => formatFileSize(bytes, formatNumber);

    const toggle = (id: string) => setSelected(() => {
        const next = new Set(chosen);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
    const allChecked = files.length > 0 && picked.length === files.length;

    const run = async () => {
        setPhase('running');
        stopped.current = false;
        setDone(0);
        setFailures([]);
        for (const file of picked) {
            if (stopped.current) break;
            try {
                await removeFile.mutateAsync(file.id);
            } catch (error) {
                setFailures(list => [...list, {file, message: error instanceof Error ? error.message : t('admin.files.deleteFailed')}]);
            }
            setDone(count => count + 1);
        }
        setPhase('done');
    };
    const close = () => {
        if (phase === 'running') return;
        onClose();
    };
    const progress = picked.length ? Math.round(done / picked.length * 100) : 0;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4"
            role="presentation"
            onMouseDown={e => e.target === e.currentTarget && close()}
        >
            <Card
                role="dialog"
                aria-modal="true"
                aria-labelledby="file-cleanup-title"
                onKeyDown={e => e.key === 'Escape' && close()}
                className="flex max-h-[calc(100dvh-32px)] w-full max-w-2xl flex-col shadow-2xl"
            >
                <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 px-5 py-4">
                    <CardTitle id="file-cleanup-title" className="m-0 text-lg font-bold text-slate-900">
                        {t('admin.files.cleanup.title')}
                    </CardTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={close}
                        disabled={phase === 'running'}
                        aria-label={t('admin.files.cleanup.close')}
                        className="h-8 w-8 px-0 text-slate-500"
                    >
                        <X size={18}/>
                    </Button>
                </CardHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <QueryState query={candidates}>
                        {phase === 'select' || phase === 'confirm' ? (
                            <>
                                <p className="m-0 mb-3 text-[13px] text-slate-600">{t('admin.files.cleanup.intro')}</p>
                                {candidates.data && candidates.data.total > candidates.data.shown && (
                                    <Alert variant="warning" className="mb-3 p-3 text-xs">
                                        {t('admin.files.cleanup.truncated', {shown: candidates.data.shown, total: candidates.data.total})}
                                    </Alert>
                                )}
                                {files.length === 0 ? (
                                    <p className="py-8 text-center text-[13px] text-slate-500">{t('admin.files.cleanup.empty')}</p>
                                ) : (
                                    <>
                                        <label className="flex items-center gap-2 border-b border-slate-100 pb-2 text-[13px] font-semibold text-slate-800">
                                            <input
                                                type="checkbox"
                                                checked={allChecked}
                                                disabled={phase !== 'select'}
                                                ref={el => {
                                                    if (el) el.indeterminate = picked.length > 0 && !allChecked;
                                                }}
                                                onChange={() => setSelected(allChecked ? new Set() : new Set(files.map(f => f.id)))}
                                                className="h-4 w-4 accent-slate-800"
                                            />
                                            {t('admin.files.cleanup.selectAll', {count: files.length})}
                                        </label>
                                        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                                            {files.map(file => (
                                                <li key={file.id}>
                                                    <label className="flex items-start gap-2 py-2 text-[13px]">
                                                        <input
                                                            type="checkbox"
                                                            checked={chosen.has(file.id)}
                                                            disabled={phase !== 'select'}
                                                            onChange={() => toggle(file.id)}
                                                            className="mt-0.5 h-4 w-4 shrink-0 accent-slate-800"
                                                        />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block break-all font-medium text-slate-900">{file.fileName}</span>
                                                            <span className="block text-xs text-slate-500">{t(`admin.files.module.${file.module}`)}</span>
                                                        </span>
                                                        <StatusBadge status={file.status}/>
                                                        <span className="w-20 shrink-0 text-right tabular-nums text-slate-700">{size(file.sizeBytes)}</span>
                                                    </label>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="space-y-3" aria-live="polite">
                                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                                    {phase === 'running' && <Spinner size="sm"/>}
                                    <span>
                                        {phase === 'running'
                                            ? t('admin.files.cleanup.progress', {done, total: picked.length})
                                            : t('admin.files.cleanup.done', {ok: done - failures.length, total: picked.length})}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={picked.length} aria-valuenow={done}>
                                    <div className="h-full bg-slate-700 transition-all" style={{width: `${progress}%`}}/>
                                </div>
                                {failures.length > 0 && (
                                    <Alert variant="error" className="p-3 text-[13px]" title={t('admin.files.cleanup.failed', {count: failures.length})}>
                                        <ul className="m-0 list-disc pl-5">
                                            {failures.map(f => (
                                                <li key={f.file.id} className="break-words">{f.file.fileName}: {f.message}</li>
                                            ))}
                                        </ul>
                                    </Alert>
                                )}
                            </div>
                        )}
                    </QueryState>
                </div>

                <CardFooter className="flex-wrap justify-end gap-2 px-5 py-3">
                    {phase === 'select' && (
                        <>
                            <Badge variant="outline" size="sm" className="mr-auto normal-case">
                                {t('admin.files.cleanup.selected', {count: picked.length, size: size(totalBytes(picked))})}
                            </Badge>
                            <Button type="button" variant="outline" size="sm" onClick={close}>
                                {t('admin.files.cancel')}
                            </Button>
                            <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => setPhase('confirm')}
                                disabled={!picked.length}
                                leftIcon={<Trash2 size={14} aria-hidden="true"/>}
                            >
                                {t('admin.files.cleanup.start', {count: picked.length})}
                            </Button>
                        </>
                    )}
                    {phase === 'confirm' && (
                        <>
                            <p role="alert" className="m-0 mr-auto basis-full text-[13px] font-semibold text-red-700 sm:basis-auto">
                                {t('admin.files.cleanup.confirm', {count: picked.length, size: size(totalBytes(picked))})}
                            </p>
                            <Button type="button" variant="outline" size="sm" onClick={() => setPhase('select')} autoFocus>
                                {t('admin.files.cleanup.back')}
                            </Button>
                            <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => void run()}
                                leftIcon={<Trash2 size={14} aria-hidden="true"/>}
                            >
                                {t('admin.files.cleanup.confirmYes')}
                            </Button>
                        </>
                    )}
                    {phase === 'running' && (
                        <Button type="button" variant="outline" size="sm" onClick={() => { stopped.current = true; }}>
                            {t('admin.files.cleanup.stop')}
                        </Button>
                    )}
                    {phase === 'done' && (
                        <Button type="button" variant="outline" size="sm" onClick={onClose} autoFocus>
                            {t('admin.files.cleanup.close')}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
