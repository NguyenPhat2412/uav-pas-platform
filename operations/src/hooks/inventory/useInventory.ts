'use client';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';
import {inventoryService} from '@/api/inventory/inventory.api';
import {useOperationMutation} from '@/hooks/useOperationMutation';

export function useEquipment(page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.list(user?.id, 'equipment', page),
        placeholderData: keepPreviousData,
        queryFn: ({signal}) => inventoryService.listEquipment(page, 20, signal),
        enabled: can('INVENTORY_VIEW')
    });
}

export function useInventoryHistory(page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: [...queryKeys.history(user?.id, 'equipment'), page],
        placeholderData: keepPreviousData,
        queryFn: ({signal}) => inventoryService.inventoryHistory(page, signal),
        enabled: can('INVENTORY_HISTORY_VIEW')
    });
}

/** Equipment writes refresh inventory, the dashboard counts and the audit trail. */
export function useEquipmentMutations() {
    return {
        create: useOperationMutation(inventoryService.createEquipment, ['equipment', 'dashboard', 'audit']),
        move: useOperationMutation(inventoryService.moveEquipment, ['equipment', 'dashboard', 'audit']),
    };
}
