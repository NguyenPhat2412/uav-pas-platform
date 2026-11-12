package com.uav.platform.repository.support;

import com.uav.platform.entity.support.SupportMessage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface SupportMessageRepository
        extends JpaRepository<SupportMessage, Long>, JpaSpecificationExecutor<SupportMessage> {

    List<SupportMessage> findByThreadIdOrderByCreatedAtAscIdAsc(Long threadId);

    long countByThreadId(Long threadId);

    @Query(
            "select m.threadId, count(m) from SupportMessage m where m.threadId in :threadIds group by m.threadId")
    List<Object[]> countGroupedByThreadIds(Collection<Long> threadIds);

    void deleteByThreadId(Long threadId);
}
