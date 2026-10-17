package com.uav.platform.modules.mission;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.uav.enums.*;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.user.repository.UserRepository;

import jakarta.persistence.LockModeType;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;

import java.lang.reflect.Method;

class MissionConcurrencyContractTest {
    @Test
    void resourceRepositoriesLockRowsDuringAssignment() throws Exception {
        Method uavFind = UavRepository.class.getMethod("findByIdForUpdate", Long.class);
        Method operatorFind = UserRepository.class.getMethod("findByIdForUpdate", Long.class);
        assertEquals(LockModeType.PESSIMISTIC_WRITE, uavFind.getAnnotation(Lock.class).value());
        assertEquals(
                LockModeType.PESSIMISTIC_WRITE, operatorFind.getAnnotation(Lock.class).value());
    }
}
