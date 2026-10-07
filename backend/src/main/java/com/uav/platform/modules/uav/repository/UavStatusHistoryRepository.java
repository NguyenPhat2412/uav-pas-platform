package com.uav.platform.modules.uav.repository;


import com.uav.platform.modules.uav.common.*;

import com.uav.platform.modules.uav.entity.UavStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface UavStatusHistoryRepository extends JpaRepository<UavStatusHistory, Long>, JpaSpecificationExecutor<UavStatusHistory> {
}
