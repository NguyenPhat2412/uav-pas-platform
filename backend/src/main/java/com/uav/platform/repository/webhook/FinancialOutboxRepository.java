package com.uav.platform.repository.webhook;

import com.uav.platform.entity.webhook.FinancialOutboxEvent;

import jakarta.persistence.LockModeType;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

import java.time.LocalDateTime;
import java.util.*;

public interface FinancialOutboxRepository
        extends JpaRepository<FinancialOutboxEvent, String>,
                JpaSpecificationExecutor<FinancialOutboxEvent> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from FinancialOutboxEvent e where e.id=:id")
    Optional<FinancialOutboxEvent> findByIdForUpdate(String id);

    @Query(
            "select e.id from FinancialOutboxEvent e where e.status in ('PENDING','WAITING_SUBSCRIBERS') and e.nextAttemptAt<=:now order by e.nextAttemptAt,e.id")
    List<String> dueIds(LocalDateTime now, Pageable pageable);
}
