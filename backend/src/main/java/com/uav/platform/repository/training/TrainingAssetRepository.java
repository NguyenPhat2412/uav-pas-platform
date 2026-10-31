package com.uav.platform.repository.training;

import com.uav.platform.entity.training.TrainingAsset;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingAssetRepository
        extends JpaRepository<TrainingAsset, Long>, JpaSpecificationExecutor<TrainingAsset> {}
