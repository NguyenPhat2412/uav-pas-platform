package com.uav.platform.dao.airspace;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.airspace.AirspaceZone;

import java.util.List;

public interface IAirspaceZoneDao extends IGenericDao<Long, AirspaceZone> {
    List<AirspaceZone> findByActiveTrueOrderByZoneTypeAscNameAsc();

    List<AirspaceZone> findAllByOrderByZoneTypeAscNameAsc();

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
}
