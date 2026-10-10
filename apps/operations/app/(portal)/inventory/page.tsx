'use client';
import { EquipmentPanel } from '@/features/operations/components/EquipmentPanel';
import { OperationsPage } from '@/components/layout/OperationsPage';
export default function InventoryPage() { return <OperationsPage title="Kho thiết bị" meta="Tồn kho và các biến động có request id để retry an toàn" permission="INVENTORY_READ" activeResource="inventory"><EquipmentPanel /></OperationsPage>; }
