'use client';

import {useI18n} from '@/contexts/I18nContext';

export default function Loading() {
    const {t} = useI18n();
    return <main className="p-8" role="status">{t('admin.loading')}</main>;
}
