package com.uav.platform.repository.notification;

import com.uav.platform.entity.notification.NotificationModulePolicy;
import com.uav.platform.enums.notification.NotificationModuleCode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationModulePolicyRepository
        extends JpaRepository<NotificationModulePolicy, Long>,
                JpaSpecificationExecutor<NotificationModulePolicy> {

    List<NotificationModulePolicy> findAllByOrderBySortOrderAscIdAsc();

    Optional<NotificationModulePolicy> findByModuleCode(NotificationModuleCode moduleCode);
}
