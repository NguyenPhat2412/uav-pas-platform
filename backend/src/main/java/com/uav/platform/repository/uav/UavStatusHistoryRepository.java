package com.uav.platform.repository.uav;

import com.uav.platform.entity.uav.UavStatusHistory;
import com.uav.platform.enums.uav.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface UavStatusHistoryRepository
        extends JpaRepository<UavStatusHistory, Long>, JpaSpecificationExecutor<UavStatusHistory> {}
