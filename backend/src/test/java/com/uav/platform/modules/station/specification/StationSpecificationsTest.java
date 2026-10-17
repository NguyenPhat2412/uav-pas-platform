package com.uav.platform.modules.station.specification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.station.enums.StationStatus;
import com.uav.platform.modules.uav.enums.*;

import jakarta.persistence.criteria.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collections;
import java.util.List;

@ExtendWith(MockitoExtension.class)
@DisplayName("StationSpecifications Unit Tests")
class StationSpecificationsTest {

    @Mock private Root<Station> root;

    @Mock private CriteriaQuery<?> query;

    @Mock private CriteriaBuilder cb;

    @Mock private Path<String> codePath;

    @Mock private Path<String> namePath;

    @Mock private Path<String> addressPath;

    @Mock private Path<StationStatus> statusPath;

    @Mock private Expression<String> lowerExpr;

    @Mock private Expression<String> coalesceExpr;

    @Mock private Predicate predicate;

    @Test
    @DisplayName("empty or null keyword produces null predicate")
    void emptyOrNullKeywordProducesNullPredicate() {
        assertThat(StationSpecifications.hasKeyword(null).toPredicate(root, query, cb)).isNull();
        assertThat(StationSpecifications.hasKeyword("").toPredicate(root, query, cb)).isNull();
        assertThat(StationSpecifications.hasKeyword("   ").toPredicate(root, query, cb)).isNull();
    }

    @Test
    @DisplayName("hasKeyword builds case-insensitive or predicate")
    void hasKeyword_BuildsOrPredicate() {
        when(root.<String>get("code")).thenReturn(codePath);
        when(root.<String>get("name")).thenReturn(namePath);
        when(root.<String>get("address")).thenReturn(addressPath);

        when(cb.coalesce(addressPath, "")).thenReturn(coalesceExpr);
        when(cb.lower(any())).thenReturn(lowerExpr);
        when(cb.like(any(), anyString())).thenReturn(predicate);
        when(cb.or(any(Predicate[].class))).thenReturn(predicate);

        Specification<Station> spec = StationSpecifications.hasKeyword("Hanoi");
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).or(any(Predicate[].class));
    }

    @Test
    @DisplayName("hasStatus and hasStatusIn tests")
    void hasStatus_Tests() {
        assertThat(StationSpecifications.hasStatus(null).toPredicate(root, query, cb)).isNull();
        assertThat(StationSpecifications.hasStatusIn(null).toPredicate(root, query, cb)).isNull();
        assertThat(
                        StationSpecifications.hasStatusIn(Collections.emptyList())
                                .toPredicate(root, query, cb))
                .isNull();

        when(root.<StationStatus>get("status")).thenReturn(statusPath);
        when(cb.equal(statusPath, StationStatus.ACTIVE)).thenReturn(predicate);

        Predicate result =
                StationSpecifications.hasStatus(StationStatus.ACTIVE).toPredicate(root, query, cb);
        assertThat(result).isSameAs(predicate);

        Predicate inPredicate = mock(Predicate.class);
        when(statusPath.in(anyCollection())).thenReturn(inPredicate);
        Predicate inResult =
                StationSpecifications.hasStatusIn(
                                List.of(StationStatus.ACTIVE, StationStatus.INACTIVE))
                        .toPredicate(root, query, cb);
        assertThat(inResult).isSameAs(inPredicate);
    }

    @Test
    @DisplayName("idIn empty or null returns disjunction, non-empty builds in predicate")
    void idIn_Test() {
        Predicate disjunction = mock(Predicate.class);
        when(cb.disjunction()).thenReturn(disjunction);

        assertThat(StationSpecifications.idIn(null).toPredicate(root, query, cb))
                .isSameAs(disjunction);
        assertThat(StationSpecifications.idIn(Collections.emptyList()).toPredicate(root, query, cb))
                .isSameAs(disjunction);

        when(root.<Long>get("id")).thenReturn(mock(Path.class));
        Predicate inPredicate = mock(Predicate.class);
        when(root.<Long>get("id").in(anyCollection())).thenReturn(inPredicate);

        assertThat(StationSpecifications.idIn(List.of(1L, 2L)).toPredicate(root, query, cb))
                .isSameAs(inPredicate);
    }
}
