package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.TrainingDocument;

import java.util.List;
import java.util.Optional;

public interface ITrainingDocumentDao extends IGenericDao<Long, TrainingDocument> {
    List<TrainingDocument> findByTargetPortalAndActiveTrueOrderBySortOrderAscIdAsc(
            String targetPortal);

    List<TrainingDocument> findByTargetPortalOrderBySortOrderAscIdAsc(String targetPortal);

    List<TrainingDocument> findByActiveTrueOrderByTargetPortalAscSortOrderAscIdAsc();

    Optional<TrainingDocument> findByCodeIgnoreCase(String code);

    Optional<TrainingDocument> findBySlugIgnoreCase(String slug);

    Optional<TrainingDocument> findByCodeIgnoreCaseOrSlugIgnoreCase(String code, String slug);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsBySlugIgnoreCase(String slug);
}
