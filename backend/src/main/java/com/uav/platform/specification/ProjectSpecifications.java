package com.uav.platform.specification;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.Project;
import com.uav.platform.enums.ProjectStatus;

import java.util.Locale;

public final class ProjectSpecifications {

    private ProjectSpecifications() {}

    public static HibernateSpecification<Project> notDeleted() {
        return (root, query, cb) -> cb.isFalse(root.get("deleted"));
    }

    public static HibernateSpecification<Project> belongsToCustomer(Long customerId) {
        return (root, query, cb) ->
                customerId == null ? null : cb.equal(root.get("customer").get("id"), customerId);
    }

    public static HibernateSpecification<Project> hasStatus(ProjectStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static HibernateSpecification<Project> hasProvince(String province) {
        return (root, query, cb) ->
                (province == null || province.isBlank())
                        ? null
                        : cb.like(
                                cb.lower(root.get("province")),
                                "%" + province.trim().toLowerCase(Locale.ROOT) + "%");
    }

    public static HibernateSpecification<Project> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("code")), pattern),
                    cb.like(cb.lower(root.get("province")), pattern),
                    cb.like(cb.lower(root.get("note")), pattern));
        };
    }
}
