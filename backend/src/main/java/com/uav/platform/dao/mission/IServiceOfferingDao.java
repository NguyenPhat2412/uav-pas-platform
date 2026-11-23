package com.uav.platform.dao.mission;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.enums.mission.*;

import java.util.List;
import java.util.Optional;

public interface IServiceOfferingDao extends IGenericDao<Long, ServiceOffering> {
    Optional<ServiceOffering> findByCode(String code);

    List<ServiceOffering> findByActiveTrueOrderByIdAsc();
}
