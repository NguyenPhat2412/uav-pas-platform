package com.uav.platform.specification.support;

import com.uav.platform.entity.support.SupportThread;

import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

public final class SupportThreadSpecifications {

    private SupportThreadSpecifications() {}

    public static Specification<SupportThread> withStatus(String status) {
        return (root, query, cb) ->
                status == null || status.isBlank()
                        ? cb.conjunction()
                        : cb.equal(
                                cb.upper(root.get("status")),
                                status.trim().toUpperCase(Locale.ROOT));
    }

    public static Specification<SupportThread> withTopic(String topic) {
        return (root, query, cb) ->
                topic == null || topic.isBlank()
                        ? cb.conjunction()
                        : cb.equal(
                                cb.upper(root.get("topic")), topic.trim().toUpperCase(Locale.ROOT));
    }

    public static Specification<SupportThread> unreadOnly(Boolean unreadOnly) {
        return (root, query, cb) ->
                Boolean.TRUE.equals(unreadOnly)
                        ? cb.greaterThan(root.get("unreadForAdmin"), 0)
                        : cb.conjunction();
    }

    public static Specification<SupportThread> matching(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) {
                return cb.conjunction();
            }
            String like =
                    "%"
                            + q.trim()
                                    .toLowerCase(Locale.ROOT)
                                    .replace("%", "\\%")
                                    .replace("_", "\\_")
                            + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("code")), like, '\\'),
                    cb.like(cb.lower(root.get("fullName")), like, '\\'),
                    cb.like(cb.lower(cb.coalesce(root.get("organization"), "")), like, '\\'),
                    cb.like(cb.lower(root.get("contactInfo")), like, '\\'),
                    cb.like(cb.lower(cb.coalesce(root.get("lastMessagePreview"), "")), like, '\\'),
                    cb.like(
                            cb.lower(cb.coalesce(root.get("assignedAdminUsername"), "")),
                            like,
                            '\\'));
        };
    }
}
