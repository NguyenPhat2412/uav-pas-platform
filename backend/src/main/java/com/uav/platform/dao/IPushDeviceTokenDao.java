package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.PushDeviceToken;

import java.util.List;
import java.util.Optional;

public interface IPushDeviceTokenDao extends IGenericDao<Long, PushDeviceToken> {
    Optional<PushDeviceToken> findByToken(String token);

    List<PushDeviceToken> findByUserIdAndActiveTrue(Long userId);

    void deleteByUserId(Long userId);
}
