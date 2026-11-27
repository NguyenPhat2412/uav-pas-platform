package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.Project;

import java.util.Optional;

public interface IProjectDao extends IGenericDao<Long, Project> {
    Optional<Project> findByIdAndDeletedFalse(Long id);

    boolean existsByCode(String code);
}
