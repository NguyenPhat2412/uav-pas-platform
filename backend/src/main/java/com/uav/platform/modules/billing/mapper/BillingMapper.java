package com.uav.platform.modules.billing.mapper;

import com.uav.platform.modules.billing.dto.response.InvoiceResponse;
import com.uav.platform.modules.billing.dto.response.ServicePlanResponse;
import com.uav.platform.modules.billing.dto.response.UserQuotaResponse;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.entity.UserQuota;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface BillingMapper {

    ServicePlanResponse toPlanResponse(ServicePlan p);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "username", source = "user.username")
    @Mapping(target = "missionId", source = "mission.id")
    @Mapping(target = "missionTitle", source = "mission.title")
    @Mapping(target = "planId", source = "plan.id")
    @Mapping(target = "planName", source = "plan.name")
    InvoiceResponse toInvoiceResponse(Invoice inv);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "username", source = "user.username")
    @Mapping(target = "fullName", source = "user.fullName")
    @Mapping(target = "planCode", source = "plan.code")
    @Mapping(target = "planName", source = "plan.name")
    @Mapping(
            target = "flightHoursRemaining",
            expression = "java(Math.max(0.0, q.getFlightHoursLimit() - q.getFlightHoursUsed()))")
    UserQuotaResponse toQuotaResponse(UserQuota q);
}
