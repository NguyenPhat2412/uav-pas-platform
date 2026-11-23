package com.uav.platform.dao.station;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.station.Station;
import com.uav.platform.enums.station.*;

import java.util.Optional;

public interface IStationDao extends IGenericDao<Long, Station> {
    boolean existsByCode(String code);

    Optional<Station> findByCode(String code);

    boolean hasReferences(Long id);
}
