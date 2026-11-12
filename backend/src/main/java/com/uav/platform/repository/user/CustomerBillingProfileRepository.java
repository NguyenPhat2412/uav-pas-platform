package com.uav.platform.repository.user;

import com.uav.platform.entity.user.CustomerBillingProfile;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CustomerBillingProfileRepository
        extends JpaRepository<CustomerBillingProfile, Long>,
                JpaSpecificationExecutor<CustomerBillingProfile> {}
