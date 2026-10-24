'use client';
import type {ReactNode} from 'react';
import {EmptyState} from '@/components/data/WorkspaceState';
import {Alert, Button, Spinner} from '@/components/ui';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/contexts/I18nContext';

export function ErrorNotice({error}: { error: Error | null }) {
    const {t} = useI18n();
    if (!error) return null;
    return <Alert
        variant="error">{error instanceof ApiError && error.status === 403 ? t('opsShared.state.forbiddenAction') : error.message === 'MISSION_MEDIA_LOCKED' ? t('opsShared.state.errors.missionMediaLocked') : error.message}</Alert>;
}

export function ResourceState({query, children}: {
    query: { isPending: boolean; error: Error | null; refetch: () => unknown };
    children: ReactNode
}) {
    const {t} = useI18n();
    if (query.error) return <div className="space-y-3"><ErrorNotice error={query.error}/><Button variant="outline"
                                                                                                 onClick={() => void query.refetch()}>{t('opsShared.state.retry')}</Button></div>;
    if (query.isPending) return <div className="flex min-h-32 items-center justify-center"><Spinner
        label={t('opsShared.state.loadingData')}/></div>;
    return children;
}

export function DataTable({headers, rows}: { headers: string[]; rows: ReactNode[][] }) {
    const {t} = useI18n();
    if (!rows.length) {
        return (
            <div className="rounded-none border border-border bg-card p-6">
                <EmptyState title={t('opsShared.state.noMatchingData')} detail={t('opsShared.state.noMatchingDetail')}/>
            </div>
        );
    }
    return (
        <div className="overflow-x-auto rounded-none border border-border bg-card" tabIndex={0} aria-label={t('opsShared.state.dataTable')}>
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-border bg-slate-50/90 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>{headers.map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.length ? (
                        rows.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                                {row.map((cell, j) => <td key={j} className="px-4 py-3 text-sm text-slate-700">{cell}</td>)}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={headers.length} className="px-4 py-10 text-center text-secondary">{t('opsShared.state.empty')}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export function Pagination({page, pages, onPage}: { page: number; pages?: number; onPage: (page: number) => void }) {
    const {t} = useI18n();
    if (!pages || pages <= 1) return null;
    return <div className="flex items-center justify-end gap-3"><Button size="sm" variant="outline"
                                                                        disabled={page === 0}
                                                                        onClick={() => onPage(page - 1)}>{t('opsShared.state.previousPage')}</Button><span className="text-sm">{page + 1} / {pages}</span><Button size="sm" variant="outline"
                                                                                   disabled={page + 1 >= pages}
                                                                                   onClick={() => onPage(page + 1)}>{t('opsShared.state.nextPage')}</Button></div>;
}

export function Detail({title, onClose, children}: { title: string; onClose: () => void; children: ReactNode }) {
    const {t} = useI18n();
    return <section aria-label={title} className="space-y-4 rounded-none border border-blue-200 bg-blue-50/30 p-5">
        <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">{title}</h2>
            <Button size="sm" variant="outline" onClick={onClose}>{t('opsShared.state.closeDetail')}</Button></div>
        {children}</section>;
}

export const selectClass = 'h-11 min-w-0 rounded-none border border-slate-300 bg-white px-3 text-sm';
