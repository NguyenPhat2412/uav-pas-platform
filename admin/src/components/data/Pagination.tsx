'use client';
import {Button} from "@/components/ui";
import {useI18n} from '@/providers/I18nContext';

export function Pagination({page, totalPages, total, onChange}: {
    page: number;
    totalPages: number;
    total: number;
    onChange: (page: number) => void
}) {
    const {t} = useI18n();
    if (!total && !page) return null;
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-card px-4 py-3 text-xs text-slate-600">
            <span>{t('opsShared.state.paginationSummary', {total, page: totalPages ? page + 1 : 0, pages: totalPages})}</span>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>
                    {t('opsShared.state.previousPage')}
                </Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>
                    {t('opsShared.state.nextPage')}
                </Button>
            </div>
        </div>
    );
}
