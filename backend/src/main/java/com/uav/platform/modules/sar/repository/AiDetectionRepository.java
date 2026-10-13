package com.uav.platform.modules.sar.repository;

import com.uav.platform.modules.sar.entity.AiDetection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiDetectionRepository extends JpaRepository<AiDetection, Long>, JpaSpecificationExecutor<AiDetection> {
    List<AiDetection> findByMissionIdOrderByCreatedAtDesc(Long missionId);
    List<AiDetection> findByAiTaskId(Long aiTaskId);
}
