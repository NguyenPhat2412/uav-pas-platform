package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.ProviderProfile;

import java.util.Optional;

public interface IProviderProfileDao extends IGenericDao<Long, ProviderProfile> {
    Optional<ProviderProfile> findByUserId(Long userId);

    Optional<ProviderProfile> findByUserUsername(String username);

    Optional<ProviderProfile> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
