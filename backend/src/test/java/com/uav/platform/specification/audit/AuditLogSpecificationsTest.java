package com.uav.platform.specification.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.audit.AuditLog;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;

import jakarta.persistence.criteria.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuditLogSpecifications Unit Tests")
class AuditLogSpecificationsTest {

    @Mock private Root<AuditLog> root;

    @Mock private CriteriaQuery<?> query;

    @Mock private CriteriaBuilder cb;

    @Mock private Path<String> actorUsernamePath;

    @Mock private Path<Long> actorUserIdPath;

    @Mock private Path<AuditAction> actionPath;

    @Mock private Path<String> entityTypePath;

    @Mock private Path<String> entityIdPath;

    @Mock private Path<String> detailsPath;

    @Mock private Path<LocalDateTime> createdAtPath;

    @Mock private Expression<String> lowerExpr;

    @Mock private Expression<String> coalesceExpr;

    @Mock private Predicate predicate;

    @Test
    @DisplayName("empty or null keyword produces null predicate")
    void emptyOrNullKeywordProducesNullPredicate() {
        assertThat(AuditLogSpecifications.hasKeyword(null).toPredicate(root, query, cb)).isNull();
        assertThat(AuditLogSpecifications.hasKeyword("").toPredicate(root, query, cb)).isNull();
        assertThat(AuditLogSpecifications.hasKeyword("   ").toPredicate(root, query, cb)).isNull();
    }

    @Test
    @DisplayName("hasKeyword builds case-insensitive or predicate over 4 fields")
    void hasKeyword_BuildsOrPredicate() {
        when(root.<String>get("actorUsername")).thenReturn(actorUsernamePath);
        when(root.<String>get("entityType")).thenReturn(entityTypePath);
        when(root.<String>get("entityId")).thenReturn(entityIdPath);
        when(root.<String>get("details")).thenReturn(detailsPath);

        when(cb.coalesce(any(), anyString())).thenReturn(coalesceExpr);
        when(cb.lower(any())).thenReturn(lowerExpr);
        when(cb.like(any(), anyString())).thenReturn(predicate);
        when(cb.or(any(Predicate[].class))).thenReturn(predicate);

        Specification<AuditLog> spec = AuditLogSpecifications.hasKeyword("system");
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).or(any(Predicate[].class));
    }

    @Test
    @DisplayName("hasActor null or blank produces null, non-empty builds equal predicate")
    void hasActor_Tests() {
        assertThat(AuditLogSpecifications.hasActor(null).toPredicate(root, query, cb)).isNull();
        assertThat(AuditLogSpecifications.hasActor("  ").toPredicate(root, query, cb)).isNull();

        when(root.<String>get("actorUsername")).thenReturn(actorUsernamePath);
        when(cb.lower(actorUsernamePath)).thenReturn(lowerExpr);
        when(cb.equal(lowerExpr, "admin")).thenReturn(predicate);

        Predicate result = AuditLogSpecifications.hasActor("admin").toPredicate(root, query, cb);
        assertThat(result).isSameAs(predicate);
    }

    @Test
    @DisplayName("hasActorUserId null produces null, non-null builds equal predicate")
    void hasActorUserId_Tests() {
        assertThat(AuditLogSpecifications.hasActorUserId(null).toPredicate(root, query, cb))
                .isNull();

        when(root.<Long>get("actorUserId")).thenReturn(actorUserIdPath);
        when(cb.equal(actorUserIdPath, 42L)).thenReturn(predicate);

        Predicate result = AuditLogSpecifications.hasActorUserId(42L).toPredicate(root, query, cb);
        assertThat(result).isSameAs(predicate);
    }

    @Test
    @DisplayName("hasAction null produces null, non-null builds equal predicate")
    void hasAction_Tests() {
        assertThat(AuditLogSpecifications.hasAction(null).toPredicate(root, query, cb)).isNull();

        when(root.<AuditAction>get("action")).thenReturn(actionPath);
        when(cb.equal(actionPath, AuditAction.LOGIN)).thenReturn(predicate);

        Predicate result =
                AuditLogSpecifications.hasAction(AuditAction.LOGIN).toPredicate(root, query, cb);
        assertThat(result).isSameAs(predicate);
    }

    @Test
    @DisplayName("hasEntityType and hasEntityId tests")
    void entityTypeAndId_Tests() {
        assertThat(AuditLogSpecifications.hasEntityType(null).toPredicate(root, query, cb))
                .isNull();
        assertThat(AuditLogSpecifications.hasEntityType("   ").toPredicate(root, query, cb))
                .isNull();
        assertThat(AuditLogSpecifications.hasEntityId(null).toPredicate(root, query, cb)).isNull();
        assertThat(AuditLogSpecifications.hasEntityId("   ").toPredicate(root, query, cb)).isNull();

        when(root.<String>get("entityType")).thenReturn(entityTypePath);
        when(cb.lower(entityTypePath)).thenReturn(lowerExpr);
        when(cb.equal(lowerExpr, "mission")).thenReturn(predicate);
        assertThat(AuditLogSpecifications.hasEntityType("MISSION").toPredicate(root, query, cb))
                .isSameAs(predicate);

        when(root.<String>get("entityId")).thenReturn(entityIdPath);
        when(cb.equal(entityIdPath, "105")).thenReturn(predicate);
        assertThat(AuditLogSpecifications.hasEntityId("105").toPredicate(root, query, cb))
                .isSameAs(predicate);
    }

    @Test
    @DisplayName("createdBetween null bounds produce null, bounds build predicate")
    void createdBetween_Tests() {
        assertThat(AuditLogSpecifications.createdBetween(null, null).toPredicate(root, query, cb))
                .isNull();

        LocalDateTime now = LocalDateTime.now();
        when(root.<LocalDateTime>get("createdAt")).thenReturn(createdAtPath);
        when(cb.greaterThanOrEqualTo(createdAtPath, now.minusDays(7))).thenReturn(predicate);
        when(cb.lessThanOrEqualTo(createdAtPath, now)).thenReturn(predicate);
        when(cb.and(any(Predicate.class), any(Predicate.class))).thenReturn(predicate);

        Predicate result =
                AuditLogSpecifications.createdBetween(now.minusDays(7), now)
                        .toPredicate(root, query, cb);
        assertThat(result).isSameAs(predicate);
    }

    @Test
    @DisplayName("filter composite specification combines null-safe criteria")
    void filter_Composite_Tests() {
        Specification<AuditLog> spec =
                AuditLogSpecifications.filter(null, null, null, null, null, null);
        assertThat(spec.toPredicate(root, query, cb)).isNull();
    }
}
