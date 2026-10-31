package com.uav.platform.service.inventory;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.inventory.EquipmentRequest;
import com.uav.platform.dto.request.inventory.QuantityRequest;
import com.uav.platform.dto.response.inventory.EquipmentResponse;
import com.uav.platform.dto.response.inventory.InventoryMovementResponse;

import org.springframework.data.domain.Pageable;

public interface InventoryService {
    PageResponse<EquipmentResponse> list(Pageable pageable);

    EquipmentResponse get(Long id);

    EquipmentResponse create(EquipmentRequest request, String actor);

    EquipmentResponse update(Long id, EquipmentRequest request, String actor);

    EquipmentResponse stockIn(Long id, QuantityRequest request, String actor);

    EquipmentResponse stockOut(Long id, QuantityRequest request, String actor);

    EquipmentResponse reserve(Long id, QuantityRequest request, String actor);

    EquipmentResponse release(Long id, QuantityRequest request, String actor);

    EquipmentResponse transfer(Long id, Long stationId, QuantityRequest request, String actor);

    PageResponse<InventoryMovementResponse> history(Pageable pageable);
}
