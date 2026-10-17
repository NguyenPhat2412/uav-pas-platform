'use client';
import { EquipmentPanel } from '@/features/operations/components/EquipmentPanel';
import { OperationsPage } from '@/components/layout/OperationsPage';
export default function InventoryPage() { return <OperationsPage title="Kho thiết bị" meta="Theo dõi tồn kho, nhập xuất, giữ chỗ và điều chuyển thiết bị" permission="INVENTORY_READ" activeResource="inventory"><EquipmentPanel /></OperationsPage>; }
