package com.uav.platform.modules.uav.specification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.entity.UavStatusHistory;
import com.uav.platform.modules.uav.enums.*;
import com.uav.platform.modules.uav.enums.UavStatus;

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
@DisplayName("UavSpecifications & UavStatusHistorySpecifications Unit Tests")
class UavSpecificationsTest {

    @Mock private Root<Uav> root;

    @Mock private Root<UavStatusHistory> historyRoot;

    @Mock private CriteriaQuery<?> query;

    @Mock private CriteriaBuilder cb;

    @Mock private Path<String> modelPath;

    @Mock private Path<String> serialNumberPath;

    @Mock private Path<String> manufacturerPath;

    @Mock private Path<UavStatus> statusPath;

    @Mock private Path<Object> stationPath;

    @Mock private Path<Object> uavPath;

    @Mock private Path<Object> idPath;

    @Mock private Expression<String> lowerExpr;

    @Mock private Predicate predicate;

    @Test
    @DisplayName("empty or null keyword produces null predicate")
    void emptyOrNullKeywordProducesNullPredicate() {
        assertThat(UavSpecifications.hasKeyword(null).toPredicate(root, query, cb)).isNull();
        assertThat(UavSpecifications.hasKeyword("").toPredicate(root, query, cb)).isNull();
        assertThat(UavSpecifications.hasKeyword("   ").toPredicate(root, query, cb)).isNull();
    }

    @Test
    @DisplayName("hasKeyword builds case-insensitive or predicate")
    void hasKeyword_BuildsOrPredicate() {
        when(root.<String>get("model")).thenReturn(modelPath);
        when(root.<String>get("serialNumber")).thenReturn(serialNumberPath);
        when(root.<String>get("manufacturer")).thenReturn(manufacturerPath);

        when(cb.lower(any())).thenReturn(lowerExpr);
        when(cb.like(any(), anyString())).thenReturn(predicate);
        when(cb.or(any(Predicate[].class))).thenReturn(predicate);

        Specification<Uav> spec = UavSpecifications.hasKeyword("Matrice");
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).or(any(Predicate[].class));
    }

    @Test
    @DisplayName("hasStatus and hasStatusIn tests")
    void hasStatus_Tests() {
        assertThat(UavSpecifications.hasStatus(null).toPredicate(root, query, cb)).isNull();
        assertThat(UavSpecifications.hasStatusIn(null).toPredicate(root, query, cb)).isNull();
        assertThat(
                        UavSpecifications.hasStatusIn(Collections.emptyList())
                                .toPredicate(root, query, cb))
                .isNull();

        when(root.<UavStatus>get("status")).thenReturn(statusPath);
        when(cb.equal(statusPath, UavStatus.AVAILABLE)).thenReturn(predicate);

        Predicate result =
                UavSpecifications.hasStatus(UavStatus.AVAILABLE).toPredicate(root, query, cb);
        assertThat(result).isSameAs(predicate);

        Predicate inPredicate = mock(Predicate.class);
        when(statusPath.in(anyCollection())).thenReturn(inPredicate);
        Predicate inResult =
                UavSpecifications.hasStatusIn(List.of(UavStatus.AVAILABLE, UavStatus.ASSIGNED))
                        .toPredicate(root, query, cb);
        assertThat(inResult).isSameAs(inPredicate);
    }

    @Test
    @DisplayName("belongsToStation and hasModel tests")
    void belongsToStationAndHasModel_Tests() {
        assertThat(UavSpecifications.belongsToStation(null).toPredicate(root, query, cb)).isNull();
        assertThat(UavSpecifications.hasModel(null).toPredicate(root, query, cb)).isNull();
        assertThat(UavSpecifications.hasModel("  ").toPredicate(root, query, cb)).isNull();

        when(root.get("station")).thenReturn(stationPath);
        when(stationPath.get("id")).thenReturn(idPath);
        when(cb.equal(idPath, 5L)).thenReturn(predicate);

        Predicate stationResult =
                UavSpecifications.belongsToStation(5L).toPredicate(root, query, cb);
        assertThat(stationResult).isSameAs(predicate);

        when(root.<String>get("model")).thenReturn(modelPath);
        when(cb.equal(modelPath, "M300")).thenReturn(predicate);
        Predicate modelResult = UavSpecifications.hasModel("M300").toPredicate(root, query, cb);
        assertThat(modelResult).isSameAs(predicate);
    }

    @Test
    @DisplayName("idIn empty or null returns disjunction, non-empty builds in predicate")
    void idIn_Test() {
        Predicate disjunction = mock(Predicate.class);
        when(cb.disjunction()).thenReturn(disjunction);

        assertThat(UavSpecifications.idIn(null).toPredicate(root, query, cb)).isSameAs(disjunction);
        assertThat(UavSpecifications.idIn(Collections.emptyList()).toPredicate(root, query, cb))
                .isSameAs(disjunction);

        when(root.<Long>get("id")).thenReturn(mock(Path.class));
        Predicate inPredicate = mock(Predicate.class);
        when(root.<Long>get("id").in(anyCollection())).thenReturn(inPredicate);

        assertThat(UavSpecifications.idIn(List.of(1L, 2L)).toPredicate(root, query, cb))
                .isSameAs(inPredicate);
    }

    @Test
    @DisplayName("UavStatusHistorySpecifications tests")
    void uavStatusHistorySpecifications_Tests() {
        assertThat(
                        UavStatusHistorySpecifications.belongsToUav(null)
                                .toPredicate(historyRoot, query, cb))
                .isNull();
        assertThat(
                        UavStatusHistorySpecifications.hasStatus(null)
                                .toPredicate(historyRoot, query, cb))
                .isNull();

        when(historyRoot.get("uav")).thenReturn(uavPath);
        when(uavPath.get("id")).thenReturn(idPath);
        when(cb.equal(idPath, 10L)).thenReturn(predicate);

        Predicate uavResult =
                UavStatusHistorySpecifications.belongsToUav(10L)
                        .toPredicate(historyRoot, query, cb);
        assertThat(uavResult).isSameAs(predicate);

        Path<UavStatus> toStatusPath = mock(Path.class);
        when(historyRoot.<UavStatus>get("toStatus")).thenReturn(toStatusPath);
        when(cb.equal(toStatusPath, UavStatus.MAINTENANCE)).thenReturn(predicate);

        Predicate statusResult =
                UavStatusHistorySpecifications.hasStatus(UavStatus.MAINTENANCE)
                        .toPredicate(historyRoot, query, cb);
        assertThat(statusResult).isSameAs(predicate);
    }
}
