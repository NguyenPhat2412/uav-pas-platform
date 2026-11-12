'use client';

import {useI18n} from '@/providers/I18nContext';
import {NotFoundView} from '@/components/shared/NotFoundView';

export default function CustomerNotFoundPage() {
    const {t} = useI18n();
    return <NotFoundView
        title={t('opsShared.routes.customer.notFoundTitle')}
        detail={t('opsShared.routes.customer.notFoundDetail')}
        homeHref="/customer/dashboard"
        homeLabel={t('opsShared.routes.customer.notFoundBack')}
        backLabel={t('common.back')}
    />;
}
