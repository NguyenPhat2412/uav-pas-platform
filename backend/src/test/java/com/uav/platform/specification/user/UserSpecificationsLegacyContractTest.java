package com.uav.platform.specification.user;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;

import jakarta.persistence.criteria.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserSpecification Unit Tests")
class UserSpecificationsLegacyContractTest {

    @Mock private Root<AppUser> root;

    @Mock private CriteriaQuery<?> query;

    @Mock private CriteriaBuilder cb;

    @Mock private Path<Object> rolePath;

    @Mock private Path<String> usernamePath;

    @Mock private Path<String> emailPath;

    @Mock private Path<String> fullNamePath;

    @Mock private Expression<String> lowerExpr;

    @Mock private Predicate predicate;

    @Test
    @DisplayName("filter with nulls should return null predicate")
    void filter_Nulls_ReturnsNull() {
        Specification<AppUser> spec = UserSpecifications.filter(null, null);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNull(result);
    }

    @Test
    @DisplayName("filter with role and keyword should build correct predicates")
    void filter_WithRoleAndKeyword_BuildsPredicates() {
        when(root.get("role")).thenReturn(rolePath);
        when(cb.equal(rolePath, UserRole.ROLE_PILOT)).thenReturn(predicate);

        when(root.<String>get("username")).thenReturn(usernamePath);
        when(root.<String>get("email")).thenReturn(emailPath);
        when(root.<String>get("fullName")).thenReturn(fullNamePath);

        when(cb.lower(any())).thenReturn(lowerExpr);
        when(cb.like(any(), anyString())).thenReturn(predicate);
        when(cb.isNotNull(fullNamePath)).thenReturn(predicate);
        when(cb.and(any(), any())).thenReturn(predicate);
        when(cb.or(any(Predicate[].class))).thenReturn(predicate);

        Specification<AppUser> spec = UserSpecifications.filter("pilot", UserRole.ROLE_PILOT);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNotNull(result);
        verify(cb).equal(rolePath, UserRole.ROLE_PILOT);
        verify(cb).or(any(Predicate[].class));
    }
}
