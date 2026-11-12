package com.uav.platform.repository.support;

import com.uav.platform.entity.support.SupportThread;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SupportThreadRepository
        extends JpaRepository<SupportThread, Long>, JpaSpecificationExecutor<SupportThread> {

    Optional<SupportThread> findByVisitorToken(String visitorToken);

    boolean existsByCode(String code);

    boolean existsByVisitorToken(String visitorToken);

    long countByStatus(String status);

    long countByUnreadForAdminGreaterThan(int threshold);

    @Query("select coalesce(sum(t.unreadForAdmin), 0) from SupportThread t")
    long sumUnreadForAdmin();
}
