package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.SessionRevocation;

import java.util.List;

public interface ISessionRevocationDao extends IGenericDao<Long, SessionRevocation> {
    List<Long> findAllUserIdsExcept(Long excludedId);
}
