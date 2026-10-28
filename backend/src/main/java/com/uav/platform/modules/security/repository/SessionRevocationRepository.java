package com.uav.platform.modules.security.repository;

import com.uav.platform.modules.security.entity.SessionRevocation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SessionRevocationRepository
        extends JpaRepository<SessionRevocation, Long>,
                JpaSpecificationExecutor<SessionRevocation> {

    /** Every account except the given one; used by "revoke all sessions". */
    @Query("select u.id from AppUser u where u.id <> :excludedId")
    List<Long> findAllUserIdsExcept(@Param("excludedId") Long excludedId);
}
