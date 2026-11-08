'use client';
import {EquipmentPanel} from "@/components/inventory/EquipmentPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';

export default function InventoryPage() {
    return <OperationsPage
                           permission="INVENTORY_VIEW" activeResource="inventory"><EquipmentPanel/></OperationsPage>;
}
