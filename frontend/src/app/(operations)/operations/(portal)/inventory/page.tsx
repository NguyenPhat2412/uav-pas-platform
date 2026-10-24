'use client';
import {EquipmentPanel} from "@/features/inventory/components/EquipmentPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/contexts/I18nContext';

export default function InventoryPage() {
    const {t} = useI18n();
    return <OperationsPage title={t('opsAssets.pages.inventory.title')} meta={t('opsAssets.pages.inventory.meta')}
                           permission="INVENTORY_READ" activeResource="inventory"><EquipmentPanel/></OperationsPage>;
}
