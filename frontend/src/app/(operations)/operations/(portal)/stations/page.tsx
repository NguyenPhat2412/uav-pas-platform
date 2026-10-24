'use client';
import {StationPanel} from "@/features/stations/components/StationPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/contexts/I18nContext';

export default function StationsPage() {
    const {t} = useI18n();
    return <OperationsPage title={t('opsAssets.pages.stations.title')} meta={t('opsAssets.pages.stations.meta')}
                           permission="STATION_READ" activeResource="stations"><StationPanel/></OperationsPage>;
}
