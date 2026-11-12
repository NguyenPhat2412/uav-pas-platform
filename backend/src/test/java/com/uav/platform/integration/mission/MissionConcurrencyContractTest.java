package com.uav.platform.integration.mission;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;

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
