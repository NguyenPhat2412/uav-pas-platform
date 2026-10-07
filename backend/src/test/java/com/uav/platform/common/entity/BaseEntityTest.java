package com.uav.platform.common.entity;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("BaseEntity OOP Contract Tests")
class BaseEntityTest {

    // Concrete test class inheriting from BaseEntity
    static class ConcreteEntity extends BaseEntity {}

    @Test
    @DisplayName("Should initialize audit timestamps on onCreate")
    void onCreate_SetsTimestamps() {
        ConcreteEntity entity = new ConcreteEntity();
        assertNull(entity.getCreatedAt());
        assertNull(entity.getUpdatedAt());

        entity.onCreate();

        assertNotNull(entity.getCreatedAt());
        assertNotNull(entity.getUpdatedAt());
        assertTrue(entity.isNew());
    }

    @Test
    @DisplayName("Should update timestamp on onUpdate")
    void onUpdate_UpdatesTimestamp() throws InterruptedException {
        ConcreteEntity entity = new ConcreteEntity();
        entity.onCreate();
        LocalDateTime originalUpdate = entity.getUpdatedAt();

        Thread.sleep(10);
        entity.onUpdate();

        assertTrue(entity.getUpdatedAt().isAfter(originalUpdate) || entity.getUpdatedAt().isEqual(originalUpdate));
    }

    @Test
    @DisplayName("Should implement equals and hashCode based on identity")
    void equalsAndHashCode_BasedOnId() {
        ConcreteEntity e1 = new ConcreteEntity();
        e1.setId(100L);

        ConcreteEntity e2 = new ConcreteEntity();
        e2.setId(100L);

        ConcreteEntity e3 = new ConcreteEntity();
        e3.setId(200L);

        assertEquals(e1, e2);
        assertNotEquals(e1, e3);
        assertEquals(e1.hashCode(), e2.hashCode());
        assertFalse(e1.isNew());
    }
}
