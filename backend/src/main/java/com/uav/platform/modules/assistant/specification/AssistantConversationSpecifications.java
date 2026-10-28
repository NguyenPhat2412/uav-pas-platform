package com.uav.platform.modules.assistant.specification;

import com.uav.platform.modules.assistant.entity.AssistantConversation;

import org.springframework.data.jpa.domain.Specification;

public final class AssistantConversationSpecifications {
    private AssistantConversationSpecifications() {}

    public static Specification<AssistantConversation> inPortal(String portal) {
        return (root, query, cb) ->
                portal == null || portal.isBlank()
                        ? cb.conjunction()
                        : cb.equal(root.get("portal"), portal);
    }

    /** Matches the username, the person's name or the conversation title, case-insensitively. */
    public static Specification<AssistantConversation> matching(String text) {
        return (root, query, cb) -> {
            if (text == null || text.isBlank()) return cb.conjunction();
            String like =
                    "%" + text.trim().toLowerCase().replace("%", "\\%").replace("_", "\\_") + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("username")), like, '\\'),
                    cb.like(cb.lower(cb.coalesce(root.get("fullName"), "")), like, '\\'),
                    cb.like(cb.lower(root.get("title")), like, '\\'));
        };
    }
}
