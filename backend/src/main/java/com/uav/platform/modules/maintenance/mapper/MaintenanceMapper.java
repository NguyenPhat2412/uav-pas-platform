package com.uav.platform.modules.maintenance.mapper;

import com.uav.platform.modules.maintenance.dto.response.MaintenanceScheduleResponse;
import com.uav.platform.modules.maintenance.dto.response.RepairMaterialResponse;
import com.uav.platform.modules.maintenance.dto.response.RepairOrderResponse;
import com.uav.platform.modules.maintenance.entity.MaintenanceSchedule;
import com.uav.platform.modules.maintenance.entity.RepairMaterial;
import com.uav.platform.modules.maintenance.entity.RepairOrder;
import com.uav.platform.modules.maintenance.service.impl.MaintenanceScheduleOperations;
import com.uav.platform.modules.maintenance.service.impl.RepairMaterialOperations;
import com.uav.platform.modules.maintenance.service.impl.RepairOrderOperations;

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
