package com.uav.platform.modules.sar.repository;

import com.uav.platform.modules.sar.entity.AiTask;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiTaskRepository
        extends JpaRepository<AiTask, Long>, JpaSpecificationExecutor<AiTask> {
    List<AiTask> findByMissionIdOrderByCreatedAtDesc(Long missionId);
}
