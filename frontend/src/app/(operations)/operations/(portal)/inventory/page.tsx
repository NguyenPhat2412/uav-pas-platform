'use client';
import {EquipmentPanel} from "@/features/inventory/components/EquipmentPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';

export default function InventoryPage() {
    return <OperationsPage
                           permission="INVENTORY_READ" activeResource="inventory"><EquipmentPanel/></OperationsPage>;
}
