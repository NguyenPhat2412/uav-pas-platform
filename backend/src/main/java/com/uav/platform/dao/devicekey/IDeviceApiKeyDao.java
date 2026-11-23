package com.uav.platform.dao.devicekey;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.devicekey.DeviceApiKey;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface IDeviceApiKeyDao extends IGenericDao<Long, DeviceApiKey> {
    Optional<DeviceApiKey> findByKeyHash(String keyHash);

    List<DeviceApiKey> findAllByOrderByCreatedAtDescIdDesc();

    List<DeviceApiKey> findExpiringBetween(LocalDateTime now, LocalDateTime until);

    int touch(Long id, LocalDateTime now, LocalDateTime threshold);
}
