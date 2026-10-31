package com.uav.platform.repository.sar;

import com.uav.platform.entity.sar.AiTask;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiTaskRepository
        extends JpaRepository<AiTask, Long>, JpaSpecificationExecutor<AiTask> {
    List<AiTask> findByMissionIdOrderByCreatedAtDesc(Long missionId);

    /** Serializes concurrent result submissions for one task so detections are stored once. */
    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select t from AiTask t where t.id = :id")
    java.util.Optional<AiTask> findByIdForUpdate(
            @org.springframework.data.repository.query.Param("id") Long id);
}
