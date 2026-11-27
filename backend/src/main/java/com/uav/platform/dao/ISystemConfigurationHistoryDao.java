package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.SystemConfigurationHistory;

import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ISystemConfigurationHistoryDao
        extends IGenericDao<Long, SystemConfigurationHistory> {
    List<SystemConfigurationHistory> findByConfigKeyOrderByChangedAtDescIdDesc(
            String configKey, Pageable pageable);
}
