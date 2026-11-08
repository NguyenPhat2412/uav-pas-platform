'use client';

import {useI18n} from '@/providers/I18nContext';
import {NotFoundView} from '@/components/shared/NotFoundView';

export default function AdminNotFoundPage() {
    const {t} = useI18n();
    return <NotFoundView
        title={t('admin.notFound.title')}
        detail={t('admin.notFound.detail')}
        homeHref="/admin/dashboard"
        homeLabel={t('admin.notFound.back')}
        backLabel={t('common.back')}
    />;
}
