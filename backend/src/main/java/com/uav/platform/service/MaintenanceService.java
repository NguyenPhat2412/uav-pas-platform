package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.CancelRepairOrderRequest;
import com.uav.platform.dto.request.CompleteRepairOrderRequest;
import com.uav.platform.dto.request.CreateMaintenanceScheduleRequest;
import com.uav.platform.dto.request.CreateRepairOrderRequest;
import com.uav.platform.dto.request.MaintenanceScheduleQueryRequest;
import com.uav.platform.dto.request.RepairOrderQueryRequest;
import com.uav.platform.dto.request.RepairOrderVersionRequest;
import com.uav.platform.dto.request.UpdateMaintenanceScheduleRequest;
import com.uav.platform.dto.request.UpdateRepairMaterialsRequest;
import com.uav.platform.dto.request.UpdateRepairOrderRequest;
import com.uav.platform.dto.response.MaintenanceScheduleResponse;
import com.uav.platform.dto.response.RepairOrderResponse;

import jakarta.validation.Valid;

import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;

@Validated
public interface MaintenanceService {
    PageResponse<MaintenanceScheduleResponse> schedules(
            MaintenanceScheduleQueryRequest request, Pageable page);

    MaintenanceScheduleResponse createSchedule(
            @Valid CreateMaintenanceScheduleRequest r, String actor);

    MaintenanceScheduleResponse updateSchedule(
            Long id, @Valid UpdateMaintenanceScheduleRequest r, String actor);

    PageResponse<RepairOrderResponse> orders(RepairOrderQueryRequest request, Pageable page);

    RepairOrderResponse order(Long id);

    RepairOrderResponse createOrder(@Valid CreateRepairOrderRequest r, String actor);

    RepairOrderResponse updateOrder(Long id, @Valid UpdateRepairOrderRequest r, String actor);

    RepairOrderResponse materials(Long id, @Valid UpdateRepairMaterialsRequest r, String actor);

    RepairOrderResponse start(Long id, @Valid RepairOrderVersionRequest r, String actor);

    RepairOrderResponse complete(Long id, @Valid CompleteRepairOrderRequest r, String actor);

    RepairOrderResponse cancel(Long id, @Valid CancelRepairOrderRequest r, String actor);
}
