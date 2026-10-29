package com.uav.platform.modules.training.repository;

import com.uav.platform.modules.training.entity.TrainingAsset;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingAssetRepository
        extends JpaRepository<TrainingAsset, Long>, JpaSpecificationExecutor<TrainingAsset> {}
