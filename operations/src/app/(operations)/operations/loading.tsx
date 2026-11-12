'use client';

import {UavLoader} from '@/components/ui/UavLoader';
import {useI18n} from '@/providers/I18nContext';

export default function Loading() {
    const {t} = useI18n();
    return <UavLoader className="min-h-[60vh]" label={t('opsShared.state.authenticating')} />;
}
