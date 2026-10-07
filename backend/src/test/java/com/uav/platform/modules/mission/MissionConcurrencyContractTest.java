package com.uav.platform.modules.mission;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.uav.repository.UavRepository;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MissionConcurrencyContractTest {
    @Test
    void resourceRepositoriesLockRowsDuringAssignment() throws Exception {
        Method uavFind = UavRepository.class.getMethod("findByIdForUpdate", Long.class);
        Method operatorFind = UserRepository.class.getMethod("findByIdForUpdate", Long.class);
        assertEquals(LockModeType.PESSIMISTIC_WRITE, uavFind.getAnnotation(Lock.class).value());
        assertEquals(LockModeType.PESSIMISTIC_WRITE, operatorFind.getAnnotation(Lock.class).value());
    }
}
