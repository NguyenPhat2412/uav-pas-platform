'use client';
import {UavPanel} from "@/features/uavs/components/UavPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/contexts/I18nContext';

export default function UavsPage() {
    const {t} = useI18n();
    return <OperationsPage title={t('opsAssets.pages.uavs.title')} meta={t('opsAssets.pages.uavs.meta')}
                           permission="UAV_READ" activeResource="uavs"><UavPanel/></OperationsPage>;
}
