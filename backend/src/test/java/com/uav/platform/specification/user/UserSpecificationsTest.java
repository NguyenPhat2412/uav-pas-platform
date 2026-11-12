package com.uav.platform.specification.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;

import jakarta.persistence.criteria.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserSpecifications Unit Tests")
class UserSpecificationsTest {

    @Mock private Root<AppUser> root;

    @Mock private CriteriaQuery<?> query;

    @Mock private CriteriaBuilder cb;

    @Mock private Path<UserRole> rolePath;

    @Mock private Path<UserStatus> statusPath;

    @Mock private Path<LocalDateTime> createdAtPath;

    @Mock private Path<Long> idPath;

    @Mock private Path<String> usernamePath;

    @Mock private Path<String> emailPath;

    @Mock private Path<String> fullNamePath;

    @Mock private Expression<String> lowerExpr;

    @Mock private Predicate predicate;

    @Test
    @DisplayName("empty or null keyword produces null predicate")
    void emptyOrNullKeywordProducesNullPredicate() {
        assertThat(UserSpecifications.hasKeyword(null).toPredicate(root, query, cb)).isNull();
        assertThat(UserSpecifications.hasKeyword("").toPredicate(root, query, cb)).isNull();
        assertThat(UserSpecifications.hasKeyword("   ").toPredicate(root, query, cb)).isNull();
    }

    @Test
    @DisplayName("hasKeyword builds case-insensitive or predicate")
    void hasKeyword_BuildsOrPredicate() {
        when(root.<String>get("username")).thenReturn(usernamePath);
        when(root.<String>get("email")).thenReturn(emailPath);
        when(root.<String>get("fullName")).thenReturn(fullNamePath);

        when(cb.lower(any())).thenReturn(lowerExpr);
        when(cb.like(any(), anyString())).thenReturn(predicate);
        when(cb.isNotNull(fullNamePath)).thenReturn(predicate);
        when(cb.and(any(), any())).thenReturn(predicate);
        when(cb.or(any(Predicate[].class))).thenReturn(predicate);

        Specification<AppUser> spec = UserSpecifications.hasKeyword("admin");
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).or(any(Predicate[].class));
    }

    @Test
    @DisplayName("hasRole null produces null, non-null builds equal predicate")
    void hasRole_Test() {
        assertThat(UserSpecifications.hasRole(null).toPredicate(root, query, cb)).isNull();

        when(root.<UserRole>get("role")).thenReturn(rolePath);
        when(cb.equal(rolePath, UserRole.ROLE_ADMIN)).thenReturn(predicate);

        Predicate result =
                UserSpecifications.hasRole(UserRole.ROLE_ADMIN).toPredicate(root, query, cb);
        assertThat(result).isSameAs(predicate);
    }

    @Test
    @DisplayName("hasStatus null produces null; a manually locked account is never ACTIVE")
    void hasStatus_Test() {
        assertThat(UserSpecifications.hasStatus(null).toPredicate(root, query, cb)).isNull();

        Path<Boolean> lockedPath = mock();
        Predicate lockedPredicate = mock(), notLocked = mock(), combined = mock();
        when(root.<UserStatus>get("status")).thenReturn(statusPath);
        when(root.<Boolean>get("manualLocked")).thenReturn(lockedPath);
        when(cb.isTrue(lockedPath)).thenReturn(lockedPredicate);
        when(cb.equal(statusPath, UserStatus.ACTIVE)).thenReturn(predicate);
        when(cb.not(lockedPredicate)).thenReturn(notLocked);
        when(cb.and(predicate, notLocked)).thenReturn(combined);

        Predicate result =
                UserSpecifications.hasStatus(UserStatus.ACTIVE).toPredicate(root, query, cb);
        assertThat(result).isSameAs(combined);
    }

    @Test
    @DisplayName("hasStatus SUSPENDED also matches manually locked accounts")
    void hasStatus_SuspendedIncludesManualLocks() {
        Path<Boolean> lockedPath = mock();
        Predicate lockedPredicate = mock(), suspended = mock(), combined = mock();
        when(root.<UserStatus>get("status")).thenReturn(statusPath);
        when(root.<Boolean>get("manualLocked")).thenReturn(lockedPath);
        when(cb.isTrue(lockedPath)).thenReturn(lockedPredicate);
        when(cb.equal(statusPath, UserStatus.SUSPENDED)).thenReturn(suspended);
        when(cb.or(suspended, lockedPredicate)).thenReturn(combined);

        Predicate result =
                UserSpecifications.hasStatus(UserStatus.SUSPENDED).toPredicate(root, query, cb);
        assertThat(result).isSameAs(combined);
    }

    @Test
    @DisplayName("createdBetween null bounds produce null, bounds build predicate")
    void createdBetween_Test() {
        assertThat(UserSpecifications.createdBetween(null, null).toPredicate(root, query, cb))
                .isNull();

        LocalDateTime now = LocalDateTime.now();
        when(root.<LocalDateTime>get("createdAt")).thenReturn(createdAtPath);
        when(cb.greaterThanOrEqualTo(createdAtPath, now.minusDays(1))).thenReturn(predicate);
        when(cb.lessThan(createdAtPath, now)).thenReturn(predicate);
        when(cb.and(any(Predicate.class), any(Predicate.class))).thenReturn(predicate);

        Predicate result =
                UserSpecifications.createdBetween(now.minusDays(1), now)
                        .toPredicate(root, query, cb);
        assertThat(result).isSameAs(predicate);
    }

    @Test
    @DisplayName("idIn empty or null returns disjunction, non-empty builds in predicate")
    void idIn_Test() {
        Predicate disjunction = mock(Predicate.class);
        when(cb.disjunction()).thenReturn(disjunction);

        assertThat(UserSpecifications.idIn(null).toPredicate(root, query, cb))
                .isSameAs(disjunction);
        assertThat(UserSpecifications.idIn(Collections.emptyList()).toPredicate(root, query, cb))
                .isSameAs(disjunction);

        when(root.<Long>get("id")).thenReturn(idPath);
        Predicate inPredicate = mock(Predicate.class);
        when(idPath.in(anyCollection())).thenReturn(inPredicate);

        assertThat(UserSpecifications.idIn(List.of(1L, 2L)).toPredicate(root, query, cb))
                .isSameAs(inPredicate);
    }
}
