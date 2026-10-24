package com.uav.platform.modules.user.repository;

import com.uav.platform.modules.user.entity.CustomerBillingProfile;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CustomerBillingProfileRepository
        extends JpaRepository<CustomerBillingProfile, Long>,
                JpaSpecificationExecutor<CustomerBillingProfile> {}
