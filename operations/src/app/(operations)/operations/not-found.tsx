'use client';

import {useI18n} from '@/providers/I18nContext';
import {NotFoundView} from '@/components/shared/NotFoundView';

export default function OperationsNotFoundPage() {
    const {t} = useI18n();
    return <NotFoundView
        title={t('opsShared.routes.operations.notFoundTitle')}
        detail={t('opsShared.routes.operations.notFoundDetail')}
        homeHref="/operations/overview"
        homeLabel={t('opsShared.routes.operations.notFoundBack')}
        backLabel={t('common.back')}
    />;
}
