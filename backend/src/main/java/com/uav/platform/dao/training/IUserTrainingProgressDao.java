package com.uav.platform.dao.training;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.training.UserTrainingProgress;

import java.util.List;
import java.util.Optional;

public interface IUserTrainingProgressDao extends IGenericDao<Long, UserTrainingProgress> {
    List<UserTrainingProgress> findByUserId(Long userId);

    Optional<UserTrainingProgress> findByUserIdAndDocumentId(Long userId, Long documentId);

    List<UserTrainingProgress> findByDocumentId(Long documentId);

    int insertIfAbsent(long userId, long documentId);
}
