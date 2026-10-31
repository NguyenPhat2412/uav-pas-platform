package com.uav.platform.specification.mission;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.mission.Mission;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;

import jakarta.persistence.criteria.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@ExtendWith(MockitoExtension.class)
@DisplayName("MissionSpecifications Unit Tests")
class MissionSpecificationsTest {

    @Mock private Root<Mission> root;

    @Mock private CriteriaQuery<?> query;

    @Mock private CriteriaBuilder cb;

    @Mock private Path<MissionStatus> statusPath;

    @Mock private Path<MissionType> missionTypePath;

    @Mock private Path<Object> stationPath;

    @Mock private Path<Object> operatorPath;

    @Mock private Path<Object> customerPath;

    @Mock private Path<Object> uavPath;

    @Mock private Path<LocalDate> requestedDatePath;

    @Mock private Path<LocalDateTime> startTimePath;

    @Mock private Path<LocalDateTime> expectedEndTimePath;

    @Mock private Path<String> codePath;

    @Mock private Path<String> titlePath;

    @Mock private Path<String> fullNamePath;

    @Mock private Path<String> usernamePath;

    @Mock private Path<Object> idPath;

    @Mock private Join<Object, Object> customerJoin;

    @Mock private Expression<String> lowerExpr;

    @Mock private Predicate predicate;

    @Test
    @DisplayName("empty or null keyword produces null predicate")
    void emptyOrNullKeywordProducesNullPredicate() {
        assertThat(MissionSpecifications.hasKeyword(null).toPredicate(root, query, cb)).isNull();
        assertThat(MissionSpecifications.hasKeyword("").toPredicate(root, query, cb)).isNull();
        assertThat(MissionSpecifications.hasKeyword("   ").toPredicate(root, query, cb)).isNull();
    }

    @Test
    @DisplayName(
            "hasKeyword builds case-insensitive or predicate across joined customer and mission fields")
    void hasKeyword_BuildsOrPredicate() {
        when(root.join(eq("customer"), eq(JoinType.LEFT))).thenReturn(customerJoin);
        when(root.<String>get("code")).thenReturn(codePath);
        when(root.<String>get("title")).thenReturn(titlePath);
        when(customerJoin.<String>get("fullName")).thenReturn(fullNamePath);
        when(customerJoin.<String>get("username")).thenReturn(usernamePath);

        when(cb.lower(any())).thenReturn(lowerExpr);
        when(cb.like(any(), anyString())).thenReturn(predicate);
        when(cb.or(any(Predicate[].class))).thenReturn(predicate);

        Specification<Mission> spec = MissionSpecifications.hasKeyword("inspection");
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).or(any(Predicate[].class));
    }

    @Test
    @DisplayName("hasStatus and hasStatusIn tests")
    void hasStatus_Tests() {
        assertThat(MissionSpecifications.hasStatus(null).toPredicate(root, query, cb)).isNull();
        assertThat(MissionSpecifications.hasStatusIn(null).toPredicate(root, query, cb)).isNull();
        assertThat(
                        MissionSpecifications.hasStatusIn(Collections.emptyList())
                                .toPredicate(root, query, cb))
                .isNull();

        when(root.<MissionStatus>get("status")).thenReturn(statusPath);
        when(cb.equal(statusPath, MissionStatus.DRAFT)).thenReturn(predicate);

        Predicate result =
                MissionSpecifications.hasStatus(MissionStatus.DRAFT).toPredicate(root, query, cb);
        assertThat(result).isSameAs(predicate);

        Predicate inPredicate = mock(Predicate.class);
        when(statusPath.in(anyCollection())).thenReturn(inPredicate);
        Predicate inResult =
                MissionSpecifications.hasStatusIn(
                                List.of(MissionStatus.CONFIRMED, MissionStatus.READY))
                        .toPredicate(root, query, cb);
        assertThat(inResult).isSameAs(inPredicate);
    }

    @Test
    @DisplayName("hasMissionType, belongsToStation, hasOperator, hasCustomer, requestedOn tests")
    void fieldSpecifications_Tests() {
        assertThat(MissionSpecifications.hasMissionType(null).toPredicate(root, query, cb))
                .isNull();
        assertThat(MissionSpecifications.belongsToStation(null).toPredicate(root, query, cb))
                .isNull();
        assertThat(MissionSpecifications.hasOperator(null).toPredicate(root, query, cb)).isNull();
        assertThat(MissionSpecifications.hasCustomer(null).toPredicate(root, query, cb)).isNull();
        assertThat(MissionSpecifications.requestedOn(null).toPredicate(root, query, cb)).isNull();

        when(root.<MissionType>get("missionType")).thenReturn(missionTypePath);
        when(cb.equal(missionTypePath, MissionType.AREA_INSPECTION)).thenReturn(predicate);
        assertThat(
                        MissionSpecifications.hasMissionType(MissionType.AREA_INSPECTION)
                                .toPredicate(root, query, cb))
                .isSameAs(predicate);

        when(root.get("station")).thenReturn(stationPath);
        when(stationPath.get("id")).thenReturn(idPath);
        when(cb.equal(idPath, 10L)).thenReturn(predicate);
        assertThat(MissionSpecifications.belongsToStation(10L).toPredicate(root, query, cb))
                .isSameAs(predicate);

        when(root.get("operator")).thenReturn(operatorPath);
        when(operatorPath.get("id")).thenReturn(idPath);
        when(cb.equal(idPath, 20L)).thenReturn(predicate);
        assertThat(MissionSpecifications.hasOperator(20L).toPredicate(root, query, cb))
                .isSameAs(predicate);

        when(root.get("customer")).thenReturn(customerPath);
        when(customerPath.get("id")).thenReturn(idPath);
        when(cb.equal(idPath, 30L)).thenReturn(predicate);
        assertThat(MissionSpecifications.hasCustomer(30L).toPredicate(root, query, cb))
                .isSameAs(predicate);

        when(root.<LocalDate>get("requestedDate")).thenReturn(requestedDatePath);
        LocalDate date = LocalDate.of(2026, 10, 10);
        when(cb.equal(requestedDatePath, date)).thenReturn(predicate);
        assertThat(MissionSpecifications.requestedOn(date).toPredicate(root, query, cb))
                .isSameAs(predicate);
    }

    @Test
    @DisplayName("overlappingUav builds correct disjunction or time predicates")
    void overlappingUav_Test() {
        Predicate disjunction = mock(Predicate.class);
        when(cb.disjunction()).thenReturn(disjunction);

        LocalDateTime start = LocalDateTime.of(2026, 10, 10, 8, 0);
        LocalDateTime end = LocalDateTime.of(2026, 10, 10, 12, 0);

        assertThat(
                        MissionSpecifications.overlappingUav(null, null, start, end)
                                .toPredicate(root, query, cb))
                .isSameAs(disjunction);
        assertThat(
                        MissionSpecifications.overlappingUav(1L, null, null, end)
                                .toPredicate(root, query, cb))
                .isSameAs(disjunction);

        when(root.get("uav")).thenReturn(uavPath);
        when(uavPath.get("id")).thenReturn(idPath);
        when(cb.equal(idPath, 1L)).thenReturn(predicate);

        when(root.<LocalDateTime>get("startTime")).thenReturn(startTimePath);
        when(root.<LocalDateTime>get("expectedEndTime")).thenReturn(expectedEndTimePath);
        when(cb.lessThan(startTimePath, end)).thenReturn(predicate);
        when(cb.greaterThan(expectedEndTimePath, start)).thenReturn(predicate);
        when(cb.and(any(), any())).thenReturn(predicate);

        Predicate result =
                MissionSpecifications.overlappingUav(1L, null, start, end)
                        .toPredicate(root, query, cb);
        assertThat(result).isNotNull();
    }
}
