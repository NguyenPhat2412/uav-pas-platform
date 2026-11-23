package com.uav.platform.dao.uav;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.uav.*;

import java.util.List;
import java.util.Optional;

public interface IUavDao extends IGenericDao<Long, Uav> {
    boolean existsBySerialNumber(String serialNumber);

    List<Uav> findAllWithStation();

    Optional<Uav> findByIdForUpdate(Long id);

    List<Uav> findByProviderIdOrderByIdDesc(Long providerId);
}
