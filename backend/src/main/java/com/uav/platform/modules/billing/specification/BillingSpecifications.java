package com.uav.platform.modules.billing.specification;

import com.uav.platform.modules.billing.common.InvoiceStatus;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.entity.UserQuota;
import org.springframework.data.jpa.domain.Specification;

public final class BillingSpecifications {

    private BillingSpecifications() {}

    public static Specification<Invoice> belongsToUser(Long userId) {
        return (root, query, cb) -> userId == null ? null : cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Invoice> hasStatus(InvoiceStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<ServicePlan> isActive(Boolean active) {
        return (root, query, cb) -> active == null ? null : cb.equal(root.get("active"), active);
    }

    public static Specification<UserQuota> quotaForUser(Long userId) {
        return (root, query, cb) -> userId == null ? null : cb.equal(root.get("user").get("id"), userId);
    }
}
