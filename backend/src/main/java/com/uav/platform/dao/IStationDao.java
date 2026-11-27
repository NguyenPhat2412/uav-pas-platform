package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.Station;
import com.uav.platform.enums.*;

import java.util.Optional;

public interface IStationDao extends IGenericDao<Long, Station> {
    boolean existsByCode(String code);

    Optional<Station> findByCode(String code);

    boolean hasReferences(Long id);
}
