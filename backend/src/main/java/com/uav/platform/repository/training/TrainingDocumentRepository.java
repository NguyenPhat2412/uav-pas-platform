package com.uav.platform.repository.training;

import com.uav.platform.entity.training.TrainingDocument;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TrainingDocumentRepository
        extends JpaRepository<TrainingDocument, Long>, JpaSpecificationExecutor<TrainingDocument> {

    List<TrainingDocument> findByTargetPortalAndActiveTrueOrderBySortOrderAscIdAsc(
            String targetPortal);

    List<TrainingDocument> findByActiveTrueOrderByTargetPortalAscSortOrderAscIdAsc();

    Optional<TrainingDocument> findByCodeIgnoreCase(String code);

    Optional<TrainingDocument> findBySlugIgnoreCase(String slug);

    Optional<TrainingDocument> findByCodeIgnoreCaseOrSlugIgnoreCase(String code, String slug);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsBySlugIgnoreCase(String slug);
}
