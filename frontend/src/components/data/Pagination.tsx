'use client';
import {Button} from "@/components/admin/ui";
import {useI18n} from '@/contexts/I18nContext';

export function Pagination({page, totalPages, total, onChange}: {
    page: number;
    totalPages: number;
    total: number;
    onChange: (page: number) => void
}) {
    const {t} = useI18n();
    if (!total && !page) return null;
    return <div className="table-pagination">
        <span>{t('opsShared.state.paginationSummary', {total, page: totalPages ? page + 1 : 0, pages: totalPages})}</span><Button variant="outline" size="sm"
                                                                                             disabled={page === 0}
                                                                                             onClick={() => onChange(page - 1)}>{t('opsShared.state.previousPage')}</Button><Button variant="outline" size="sm" disabled={page + 1 >= totalPages}
                              onClick={() => onChange(page + 1)}>{t('opsShared.state.nextPage')}</Button></div>;
}
