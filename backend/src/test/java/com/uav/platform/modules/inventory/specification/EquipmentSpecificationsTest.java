package com.uav.platform.modules.inventory.specification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.inventory.entity.InventoryMovement;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.inventory.enums.EquipmentStatus;
import com.uav.platform.modules.inventory.enums.EquipmentType;
import com.uav.platform.modules.inventory.enums.MovementType;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.enums.*;
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
@DisplayName("EquipmentSpecifications & InventoryMovementSpecifications Unit Tests")
class EquipmentSpecificationsTest {

    @Mock private Root<Equipment> root;

    @Mock private Root<InventoryMovement> movementRoot;

    @Mock private CriteriaQuery<?> query;

    @Mock private CriteriaBuilder cb;

    @Mock private Path<String> namePath;

    @Mock private Path<String> serialNumberPath;

    @Mock private Path<EquipmentType> typePath;

    @Mock private Path<EquipmentStatus> statusPath;

    @Mock private Path<Object> stationPath;

    @Mock private Path<Object> equipmentPath;

    @Mock private Path<Object> idPath;

    @Mock private Expression<String> lowerExpr;

    @Mock private Expression<String> coalesceExpr;

    @Mock private Predicate predicate;

    @Test
    @DisplayName("empty or null keyword produces null predicate")
    void emptyOrNullKeywordProducesNullPredicate() {
        assertThat(EquipmentSpecifications.hasKeyword(null).toPredicate(root, query, cb)).isNull();
        assertThat(EquipmentSpecifications.hasKeyword("").toPredicate(root, query, cb)).isNull();
        assertThat(EquipmentSpecifications.hasKeyword("   ").toPredicate(root, query, cb)).isNull();
    }

    @Test
    @DisplayName("hasKeyword builds case-insensitive or predicate")
    void hasKeyword_BuildsOrPredicate() {
        when(root.<String>get("name")).thenReturn(namePath);
        when(root.<String>get("serialNumber")).thenReturn(serialNumberPath);

        when(cb.coalesce(serialNumberPath, "")).thenReturn(coalesceExpr);
        when(cb.lower(any())).thenReturn(lowerExpr);
        when(cb.like(any(), anyString())).thenReturn(predicate);
        when(cb.or(any(Predicate.class), any(Predicate.class))).thenReturn(predicate);

        Specification<Equipment> spec = EquipmentSpecifications.hasKeyword("Battery");
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).or(any(Predicate.class), any(Predicate.class));
    }

    @Test
    @DisplayName("hasType, hasStatus, belongsToStation tests")
    void fieldSpecifications_Tests() {
        assertThat(EquipmentSpecifications.hasType(null).toPredicate(root, query, cb)).isNull();
        assertThat(EquipmentSpecifications.hasStatus(null).toPredicate(root, query, cb)).isNull();
        assertThat(EquipmentSpecifications.belongsToStation(null).toPredicate(root, query, cb))
                .isNull();

        when(root.<EquipmentType>get("type")).thenReturn(typePath);
        when(cb.equal(typePath, EquipmentType.BATTERY)).thenReturn(predicate);
        assertThat(
                        EquipmentSpecifications.hasType(EquipmentType.BATTERY)
                                .toPredicate(root, query, cb))
                .isSameAs(predicate);

        when(root.<EquipmentStatus>get("status")).thenReturn(statusPath);
        when(cb.equal(statusPath, EquipmentStatus.ACTIVE)).thenReturn(predicate);
        assertThat(
                        EquipmentSpecifications.hasStatus(EquipmentStatus.ACTIVE)
                                .toPredicate(root, query, cb))
                .isSameAs(predicate);

        when(root.get("station")).thenReturn(stationPath);
        when(stationPath.get("id")).thenReturn(idPath);
        when(cb.equal(idPath, 3L)).thenReturn(predicate);
        assertThat(EquipmentSpecifications.belongsToStation(3L).toPredicate(root, query, cb))
                .isSameAs(predicate);
    }

    @Test
    @DisplayName("idIn empty or null returns disjunction, non-empty builds in predicate")
    void idIn_Test() {
        Predicate disjunction = mock(Predicate.class);
        when(cb.disjunction()).thenReturn(disjunction);

        assertThat(EquipmentSpecifications.idIn(null).toPredicate(root, query, cb))
                .isSameAs(disjunction);
        assertThat(
                        EquipmentSpecifications.idIn(Collections.emptyList())
                                .toPredicate(root, query, cb))
                .isSameAs(disjunction);

        when(root.<Long>get("id")).thenReturn(mock(Path.class));
        Predicate inPredicate = mock(Predicate.class);
        when(root.<Long>get("id").in(anyCollection())).thenReturn(inPredicate);

        assertThat(EquipmentSpecifications.idIn(List.of(1L, 2L)).toPredicate(root, query, cb))
                .isSameAs(inPredicate);
    }

    @Test
    @DisplayName("InventoryMovementSpecifications tests")
    void inventoryMovementSpecifications_Tests() {
        assertThat(
                        InventoryMovementSpecifications.belongsToEquipment(null)
                                .toPredicate(movementRoot, query, cb))
                .isNull();
        assertThat(
                        InventoryMovementSpecifications.hasMovementType(null)
                                .toPredicate(movementRoot, query, cb))
                .isNull();
        assertThat(
                        InventoryMovementSpecifications.hasActor(null)
                                .toPredicate(movementRoot, query, cb))
                .isNull();
        assertThat(
                        InventoryMovementSpecifications.hasActor("  ")
                                .toPredicate(movementRoot, query, cb))
                .isNull();

        when(movementRoot.get("equipment")).thenReturn(equipmentPath);
        when(equipmentPath.get("id")).thenReturn(idPath);
        when(cb.equal(idPath, 7L)).thenReturn(predicate);
        assertThat(
                        InventoryMovementSpecifications.belongsToEquipment(7L)
                                .toPredicate(movementRoot, query, cb))
                .isSameAs(predicate);

        Path<MovementType> movTypePath = mock(Path.class);
        when(movementRoot.<MovementType>get("type")).thenReturn(movTypePath);
        when(cb.equal(movTypePath, MovementType.STOCK_IN)).thenReturn(predicate);
        assertThat(
                        InventoryMovementSpecifications.hasMovementType(MovementType.STOCK_IN)
                                .toPredicate(movementRoot, query, cb))
                .isSameAs(predicate);

        Path<String> actorPath = mock(Path.class);
        when(movementRoot.<String>get("actor")).thenReturn(actorPath);
        when(cb.equal(actorPath, "warehouse_admin")).thenReturn(predicate);
        assertThat(
                        InventoryMovementSpecifications.hasActor("warehouse_admin")
                                .toPredicate(movementRoot, query, cb))
                .isSameAs(predicate);
    }
}
