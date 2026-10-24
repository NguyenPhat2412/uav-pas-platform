'use client';
import {MediaPanel} from "@/features/media/components/MediaPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/contexts/I18nContext';

export default function MediaPage() {
    const {t} = useI18n();
    return <OperationsPage title={t('opsAssets.pages.media.title')} meta={t('opsAssets.pages.media.meta')}
                           permission="MEDIA_READ" activeResource="media"><MediaPanel/></OperationsPage>;
}
