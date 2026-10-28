package com.uav.platform.modules.security.specification;

import com.uav.platform.modules.auth.entity.RefreshToken;
import com.uav.platform.modules.user.entity.AppUser;

import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;

/** User filters specific to the admin session list. */
public final class SecuritySessionSpecifications {

    private SecuritySessionSpecifications() {}

    /** Users holding a refresh token that is neither revoked nor expired. */
    public static Specification<AppUser> hasActiveSession(boolean activeOnly, Instant now) {
        return (root, query, cb) -> {
            if (!activeOnly) return null;
            var sub = query.subquery(Long.class);
            var token = sub.from(RefreshToken.class);
            sub.select(token.get("id"))
                    .where(
                            cb.equal(token.get("user").get("id"), root.get("id")),
                            cb.isFalse(token.get("revoked")),
                            cb.greaterThan(token.get("expiryDate"), now));
            return cb.exists(sub);
        };
    }
}
