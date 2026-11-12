package com.uav.platform.mapper.billing;

import com.uav.platform.dto.response.billing.InvoiceResponse;
import com.uav.platform.dto.response.billing.ServicePlanResponse;
import com.uav.platform.dto.response.billing.UserQuotaResponse;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.billing.ServicePlan;
import com.uav.platform.entity.billing.UserQuota;

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
