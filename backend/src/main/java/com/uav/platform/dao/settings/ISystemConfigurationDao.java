package com.uav.platform.dao.settings;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.settings.SystemConfiguration;

import java.util.List;
import java.util.Optional;

public interface ISystemConfigurationDao extends IGenericDao<Long, SystemConfiguration> {
    Optional<SystemConfiguration> findByConfigKey(String configKey);

    List<SystemConfiguration> findByCategory(String category);

    List<SystemConfiguration> findByPublicSettingTrueOrderByConfigKeyAsc();
}
