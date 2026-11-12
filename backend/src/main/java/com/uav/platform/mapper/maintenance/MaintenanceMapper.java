package com.uav.platform.mapper.maintenance;

import com.uav.platform.dto.response.maintenance.MaintenanceScheduleResponse;
import com.uav.platform.dto.response.maintenance.RepairMaterialResponse;
import com.uav.platform.dto.response.maintenance.RepairOrderResponse;
import com.uav.platform.entity.maintenance.MaintenanceSchedule;
import com.uav.platform.entity.maintenance.RepairMaterial;
import com.uav.platform.entity.maintenance.RepairOrder;
import com.uav.platform.service.impl.maintenance.MaintenanceScheduleOperations;
import com.uav.platform.service.impl.maintenance.RepairMaterialOperations;
import com.uav.platform.service.impl.maintenance.RepairOrderOperations;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import java.time.LocalDate;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        imports = {
            MaintenanceScheduleOperations.class,
            RepairMaterialOperations.class,
            RepairOrderOperations.class
        })
public interface MaintenanceMapper {

    @Mapping(target = "uavId", source = "s.uav.id")
    @Mapping(target = "uavSerialNumber", source = "s.uav.serialNumber")
    @Mapping(
            target = "dueStatus",
            expression = "java(MaintenanceScheduleOperations.dueStatus(s, today))")
    MaintenanceScheduleResponse toScheduleResponse(MaintenanceSchedule s, LocalDate today);

    @Mapping(
            target = "quantity",
            expression = "java(m.getQuantity().stripTrailingZeros().toPlainString())")
    @Mapping(target = "unitPrice", expression = "java(m.getUnitPrice().toPlainString())")
    @Mapping(
            target = "lineTotal",
            expression = "java(RepairMaterialOperations.lineTotal(m).toPlainString())")
    RepairMaterialResponse toMaterialResponse(RepairMaterial m);

    @Mapping(target = "uavId", source = "uav.id")
    @Mapping(target = "uavSerialNumber", source = "uav.serialNumber")
    @Mapping(target = "scheduleId", source = "schedule.id")
    @Mapping(
            target = "totalMaterialCost",
            expression = "java(RepairOrderOperations.totalMaterialCost(o).toPlainString())")
    @Mapping(target = "currency", constant = "VND")
    RepairOrderResponse toOrderResponse(RepairOrder o);
}
