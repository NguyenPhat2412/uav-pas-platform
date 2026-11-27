package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.MissionBillingJob;

import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.*;

public interface IMissionBillingJobDao extends IGenericDao<Long, MissionBillingJob> {
    Optional<MissionBillingJob> findByMissionId(Long missionId);

    Optional<Long> missionIdForJob(Long id);

    Optional<MissionBillingJob> findByIdForUpdate(Long id);

    List<Long> dueIds(LocalDateTime now, Pageable pageable);
}
