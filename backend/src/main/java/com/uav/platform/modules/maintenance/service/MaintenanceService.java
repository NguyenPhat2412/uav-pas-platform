package com.uav.platform.modules.maintenance.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.maintenance.dto.request.CancelRepairOrderRequest;
import com.uav.platform.modules.maintenance.dto.request.CompleteRepairOrderRequest;
import com.uav.platform.modules.maintenance.dto.request.CreateMaintenanceScheduleRequest;
import com.uav.platform.modules.maintenance.dto.request.CreateRepairOrderRequest;
import com.uav.platform.modules.maintenance.dto.request.RepairOrderVersionRequest;
import com.uav.platform.modules.maintenance.dto.request.UpdateMaintenanceScheduleRequest;
import com.uav.platform.modules.maintenance.dto.request.UpdateRepairMaterialsRequest;
import com.uav.platform.modules.maintenance.dto.request.UpdateRepairOrderRequest;
import com.uav.platform.modules.maintenance.dto.response.MaintenanceScheduleResponse;
import com.uav.platform.modules.maintenance.dto.response.RepairOrderResponse;
import com.uav.platform.modules.maintenance.enums.DueStatus;
import com.uav.platform.modules.maintenance.enums.RepairStatus;

import jakarta.validation.Valid;

import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;

@Validated
public interface MaintenanceService {
    PageResponse<MaintenanceScheduleResponse> schedules(
            Long uavId, DueStatus dueStatus, Pageable page);

    MaintenanceScheduleResponse createSchedule(
            @Valid CreateMaintenanceScheduleRequest r, String actor);

    MaintenanceScheduleResponse updateSchedule(
            Long id, @Valid UpdateMaintenanceScheduleRequest r, String actor);

    PageResponse<RepairOrderResponse> orders(Long uavId, RepairStatus status, Pageable page);

    RepairOrderResponse order(Long id);

    RepairOrderResponse createOrder(@Valid CreateRepairOrderRequest r, String actor);

    RepairOrderResponse updateOrder(Long id, @Valid UpdateRepairOrderRequest r, String actor);

    RepairOrderResponse materials(Long id, @Valid UpdateRepairMaterialsRequest r, String actor);

    RepairOrderResponse start(Long id, @Valid RepairOrderVersionRequest r, String actor);

    RepairOrderResponse complete(Long id, @Valid CompleteRepairOrderRequest r, String actor);

    RepairOrderResponse cancel(Long id, @Valid CancelRepairOrderRequest r, String actor);
}
