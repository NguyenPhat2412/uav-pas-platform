package com.uav.platform.integration.mission;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uav.platform.dao.impl.uav.UavDaoImpl;
import com.uav.platform.dao.impl.user.UserDaoImpl;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.user.AppUser;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.hibernate.Session;
import org.hibernate.query.Query;
import org.junit.jupiter.api.Test;

import java.util.Optional;

class MissionConcurrencyContractTest {
    @Test
    @SuppressWarnings("unchecked")
    void resourceDaosLockRowsWithPessimisticWriteDuringAssignment() {
        EntityManager uavEm = mock(EntityManager.class);
        Session uavSession = mock(Session.class);
        Query<Uav> uavQuery = mock(Query.class);
        when(uavEm.unwrap(Session.class)).thenReturn(uavSession);
        when(uavSession.createQuery(anyString(), eq(Uav.class))).thenReturn(uavQuery);
        when(uavQuery.setParameter("id", 1L)).thenReturn(uavQuery);
        when(uavQuery.setLockMode(LockModeType.PESSIMISTIC_WRITE)).thenReturn(uavQuery);
        when(uavQuery.uniqueResultOptional()).thenReturn(Optional.empty());

        UavDaoImpl uavDao = new UavDaoImpl(uavEm);
        uavDao.findByIdForUpdate(1L);
        verify(uavQuery).setLockMode(LockModeType.PESSIMISTIC_WRITE);

        EntityManager userEm = mock(EntityManager.class);
        Session userSession = mock(Session.class);
        Query<AppUser> userQuery = mock(Query.class);
        when(userEm.unwrap(Session.class)).thenReturn(userSession);
        when(userSession.createQuery(anyString(), eq(AppUser.class))).thenReturn(userQuery);
        when(userQuery.setParameter("id", 2L)).thenReturn(userQuery);
        when(userQuery.setLockMode(LockModeType.PESSIMISTIC_WRITE)).thenReturn(userQuery);
        when(userQuery.uniqueResultOptional()).thenReturn(Optional.empty());

        UserDaoImpl userDao = new UserDaoImpl(userEm);
        userDao.findByIdForUpdate(2L);
        verify(userQuery).setLockMode(LockModeType.PESSIMISTIC_WRITE);
    }
}
