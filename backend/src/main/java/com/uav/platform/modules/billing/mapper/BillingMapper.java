package com.uav.platform.modules.billing.mapper;

import com.uav.platform.modules.billing.dto.response.InvoiceResponse;
import com.uav.platform.modules.billing.dto.response.ServicePlanResponse;
import com.uav.platform.modules.billing.dto.response.UserQuotaResponse;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.entity.UserQuota;

public final class BillingMapper {

    private BillingMapper() {}

    public static ServicePlanResponse toPlanResponse(ServicePlan p) {
        return new ServicePlanResponse(
                p.getId(),
                p.getCode(),
                p.getName(),
                p.getPrice(),
                p.getBillingCycle(),
                p.getMaxMonthlyFlightHours(),
                p.getMaxConcurrentUavs(),
                p.getAllowSarAi(),
                p.getDescription(),
                p.getActive());
    }

    public static InvoiceResponse toInvoiceResponse(Invoice inv) {
        return new InvoiceResponse(
                inv.getId(),
                inv.getCode(),
                inv.getUser().getId(),
                inv.getUser().getUsername(),
                inv.getMission() != null ? inv.getMission().getId() : null,
                inv.getMission() != null ? inv.getMission().getTitle() : null,
                inv.getPlan() != null ? inv.getPlan().getId() : null,
                inv.getPlan() != null ? inv.getPlan().getName() : null,
                inv.getAmount(),
                inv.getStatus(),
                inv.getDueDate(),
                inv.getPaidAt(),
                inv.getNotes(),
                inv.getCreatedAt());
    }

    public static UserQuotaResponse toQuotaResponse(UserQuota q) {
        double remaining = Math.max(0.0, q.getFlightHoursLimit() - q.getFlightHoursUsed());
        return new UserQuotaResponse(
                q.getId(),
                q.getUser().getId(),
                q.getUser().getUsername(),
                q.getUser().getFullName(),
                q.getPlan().getCode(),
                q.getPlan().getName(),
                q.getFlightHoursUsed(),
                q.getFlightHoursLimit(),
                remaining,
                q.getConcurrentUavsUsed(),
                q.getConcurrentUavsLimit(),
                q.getCycleStart(),
                q.getCycleEnd());
    }
}
