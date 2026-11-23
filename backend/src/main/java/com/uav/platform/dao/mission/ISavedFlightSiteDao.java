package com.uav.platform.dao.mission;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.mission.SavedFlightSite;

import java.util.List;
import java.util.Optional;

public interface ISavedFlightSiteDao extends IGenericDao<Long, SavedFlightSite> {
    List<SavedFlightSite> findByUserIdOrderByUpdatedAtDescIdDesc(Long userId);

    long countByUserId(Long userId);

    Optional<SavedFlightSite> findByIdAndUserId(Long id, Long userId);
}
