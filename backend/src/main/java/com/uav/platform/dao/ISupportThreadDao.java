package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.SupportThread;

import java.util.Optional;

public interface ISupportThreadDao extends IGenericDao<Long, SupportThread> {
    Optional<SupportThread> findByVisitorToken(String visitorToken);

    boolean existsByCode(String code);

    boolean existsByVisitorToken(String visitorToken);

    long countByStatus(String status);

    long countByUnreadForAdminGreaterThan(int threshold);

    long sumUnreadForAdmin();
}
