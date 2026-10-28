package com.uav.platform.modules.training.repository;

import com.uav.platform.modules.training.entity.UserTrainingProgress;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserTrainingProgressRepository
        extends JpaRepository<UserTrainingProgress, Long>,
                JpaSpecificationExecutor<UserTrainingProgress> {

    List<UserTrainingProgress> findByUserId(Long userId);

    Optional<UserTrainingProgress> findByUserIdAndDocumentId(Long userId, Long documentId);
}
